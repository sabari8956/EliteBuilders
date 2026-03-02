import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { listSubmissionRecords } from "@/features/submissions/repository";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/features/platform/supabase";

const moderationSchema = z.object({
  submissionId: z.string().min(1),
  action: z.enum(["disqualify", "restore", "flag"]),
  reason: z.string().min(1).max(1000),
});

/**
 * GET /api/admin/moderation
 * Lists all non-draft submissions for admin moderation review.
 */
export async function GET() {
  const auth = await requireAuth(["admin"], "/api/admin/moderation");
  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  try {
    // Fetch across all relevant statuses for admin view
    const statuses = ["submitted", "queued", "running", "ai_scored", "awaiting_human_review", "finalized", "failed", "disqualified"] as const;
    const results = await Promise.all(
      statuses.map((status) => listSubmissionRecords({ status })),
    );
    const items = results.flat();
    return NextResponse.json(ok({ items, count: items.length }));
  } catch (error) {
    console.error("ADMIN_MODERATION_LIST_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to list submissions for moderation."), { status: 500 });
  }
}

/**
 * POST /api/admin/moderation
 * Accepts a moderation action against a submission.
 * Actions: disqualify | restore | flag
 */
export async function POST(request: Request) {
  const auth = await requireAuth(["admin"], "/api/admin/moderation");
  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  let body: z.infer<typeof moderationSchema>;
  try {
    body = moderationSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", "Invalid moderation payload.", error.flatten()),
        { status: 400 },
      );
    }
    return NextResponse.json(fail("BAD_REQUEST", "Malformed request body."), { status: 400 });
  }

  const statusMap: Record<string, string> = {
    disqualify: "disqualified",
    restore: "submitted",
    flag: "awaiting_human_review",
  };

  const newStatus = statusMap[body.action];
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("submissions")
      .update({ status: newStatus, updated_at: now })
      .eq("id", body.submissionId);

    if (error) {
      console.error("ADMIN_MODERATION_UPDATE_ERROR", error);
      return NextResponse.json(fail("INTERNAL_ERROR", "Failed to apply moderation action."), { status: 500 });
    }
  } else {
    // Local fallback — best-effort in-memory update via evaluation store
    const { withDatabase } = await import("@/features/evaluation/store");
    await withDatabase((db) => {
      const sub = db.submissions.find((s) => s.id === body.submissionId);
      if (sub) {
        (sub as Record<string, unknown>).state = newStatus;
        sub.updated_at = now;
        sub.timeline.push({ state: newStatus as never, at: now, message: `Admin moderation: ${body.action} — ${body.reason}` });
      }
    });
  }

  console.info(`[ADMIN_MODERATION] actor=${auth.user.id} submission=${body.submissionId} action=${body.action} reason="${body.reason}"`);

  return NextResponse.json(
    ok({
      submissionId: body.submissionId,
      action: body.action,
      newStatus,
      actorId: auth.user.id,
      at: now,
    }),
  );
}
