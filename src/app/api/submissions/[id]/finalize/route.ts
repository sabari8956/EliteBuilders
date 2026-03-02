import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { getSubmissionRecord } from "@/features/submissions/repository";
import { computeFinalScore } from "@/features/evaluation/finalization";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/features/platform/supabase";

type Params = { id: string };

const finalizeSchema = z.object({
    human_score: z.number().min(0).max(100),
    notes: z.string().min(1).max(2000),
});

export async function POST(
    request: Request,
    context: { params: Promise<Params> },
) {
    const auth = await requireAuth(["evaluator", "admin"], "/api/submissions/:id/finalize");
    if ("response" in auth) {
        return NextResponse.json(auth.response, { status: auth.status });
    }

    const { id } = await context.params;

    let body: z.infer<typeof finalizeSchema>;
    try {
        body = finalizeSchema.parse(await request.json());
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                fail("VALIDATION_ERROR", "Invalid finalize payload", error.flatten()),
                { status: 400 },
            );
        }
        return NextResponse.json(fail("BAD_REQUEST", "Malformed request body."), { status: 400 });
    }

    // Load the submission to validate state
    const submission = await getSubmissionRecord(id).catch(() => null);
    if (!submission) {
        return NextResponse.json(fail("NOT_FOUND", "Submission not found."), { status: 404 });
    }

    if (submission.status === "finalized") {
        return NextResponse.json(
            fail("ALREADY_FINALIZED", "Submission is already finalized. Audit fields are immutable."),
            { status: 409 },
        );
    }

    if (!["ai_scored", "awaiting_human_review"].includes(submission.status)) {
        return NextResponse.json(
            fail(
                "INVALID_STATE",
                `Cannot finalize a submission in state '${submission.status}'. Expected ai_scored or awaiting_human_review.`,
            ),
            { status: 422 },
        );
    }

    const now = new Date().toISOString();

    // ─── Supabase path ────────────────────────────────────────────────────────
    if (isSupabaseConfigured()) {
        const supabase = getSupabaseServerClient();

        // Fetch ai_score from supabase to compute final_score
        const { data: row, error: readErr } = await supabase
            .from("submissions")
            .select("ai_score")
            .eq("id", id)
            .maybeSingle<{ ai_score: number | null }>();

        if (readErr) {
            console.error("FINALIZE_READ_ERROR", readErr);
            return NextResponse.json(fail("INTERNAL_ERROR", "Unable to read submission for finalization."), { status: 500 });
        }

        const aiScore = row?.ai_score ?? null;
        if (aiScore === null) {
            return NextResponse.json(
                fail("MISSING_AI_SCORE", "Cannot finalize: no AI score is present on this submission."),
                { status: 422 },
            );
        }

        const finalScore = computeFinalScore(aiScore, body.human_score);

        const { error: updateErr } = await supabase
            .from("submissions")
            .update({
                human_score: body.human_score,
                final_score: finalScore,
                finalized_at: now,
                finalized_by: auth.user.id,
                finalization_notes: body.notes,
                status: "finalized",
                updated_at: now,
            })
            .eq("id", id);

        if (updateErr) {
            console.error("FINALIZE_UPDATE_ERROR", updateErr);
            return NextResponse.json(fail("INTERNAL_ERROR", "Failed to persist finalization."), { status: 500 });
        }

        // ── Sync finalised state into Epic 3 DB so the leaderboard updates ──
        try {
            const { withDatabase, pushTimeline } = await import("@/features/evaluation/store");
            await withDatabase((db) => {
                const epic3Sub = db.submissions.find((s) => s.id === id);
                if (epic3Sub) {
                    epic3Sub.human_score = body.human_score;
                    epic3Sub.final_score = finalScore;
                    epic3Sub.finalized_at = now;
                    epic3Sub.finalized_by = auth.user.id;
                    epic3Sub.finalization_notes = body.notes;
                    pushTimeline(epic3Sub, "finalized", `Finalized by ${auth.user.id}. Final score: ${finalScore}.`, now);
                }
            });
        } catch (syncErr) {
            // Non-fatal — platform is already updated; leaderboard sync is best-effort
            console.error("EPIC3_FINALIZE_SYNC_ERROR", syncErr);
        }

        return NextResponse.json(
            ok({
                submissionId: id,
                finalScore,
                humanScore: body.human_score,
                aiScore,
                finalizedAt: now,
                finalizedBy: auth.user.id,
            }),
        );
    }

    // ─── Local-store fallback (dev / no Supabase) ────────────────────────────
    const { withDatabase, pushTimeline } = await import("@/features/evaluation/store");
    const { finalizeSubmission } = await import("@/features/evaluation/finalization");

    try {
        const finalized = await withDatabase(async (db) => {
            const epic3Submission = db.submissions.find((s) => s.id === id);
            if (!epic3Submission) {
                throw new Error(`SUBMISSION_NOT_FOUND:${id}`);
            }
            return finalizeSubmission(epic3Submission, auth.user.id, body.human_score, body.notes);
        });

        // Also update the platform in-memory store status
        const { getStore } = await import("@/features/platform/store");
        const platformSub = getStore().submissions.get(id);
        if (platformSub) {
            platformSub.status = "finalized";
            platformSub.updatedAt = now;
        }

        return NextResponse.json(
            ok({
                submissionId: id,
                finalScore: finalized.final_score,
                humanScore: finalized.human_score,
                aiScore: finalized.ai_score,
                finalizedAt: finalized.finalized_at,
                finalizedBy: finalized.finalized_by,
            }),
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown finalization error";
        if (message.startsWith("SUBMISSION_NOT_FOUND:")) {
            return NextResponse.json(fail("NOT_FOUND", "Submission not found."), { status: 404 });
        }
        console.error("FINALIZE_LOCAL_ERROR", error);
        return NextResponse.json(fail("FINALIZATION_FAILED", message), { status: 400 });
    }
}
