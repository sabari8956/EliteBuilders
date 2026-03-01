import { NextResponse } from "next/server";
import { z } from "zod";
import { finalizeSubmission } from "@/features/evaluation/finalization";
import { withDatabase } from "@/features/evaluation/store";
import { fail, ok } from "@/lib/api-envelope";

type Params = { id: string };

const finalizeSchema = z.object({
  evaluator_id: z.string().min(1),
  human_score: z.number().min(0).max(100),
  notes: z.string().min(1).max(2000),
});

export async function POST(
  request: Request,
  context: { params: Promise<Params> },
) {
  try {
    const { id } = await context.params;
    const payload = finalizeSchema.parse(await request.json());

    const finalized = await withDatabase(async (db) => {
      const submission = db.submissions.find((entry) => entry.id === id);
      if (!submission) {
        throw new Error(`SUBMISSION_NOT_FOUND:${id}`);
      }

      return finalizeSubmission(
        submission,
        payload.evaluator_id,
        payload.human_score,
        payload.notes,
      );
    });

    return NextResponse.json(ok({ submission: finalized }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", "Invalid finalize payload", error.flatten()),
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown finalization error";

    if (message.startsWith("SUBMISSION_NOT_FOUND:")) {
      return NextResponse.json(
        fail("SUBMISSION_NOT_FOUND", `Submission ${message.split(":")[1]} was not found.`),
        { status: 404 },
      );
    }

    return NextResponse.json(
      fail("FINALIZATION_FAILED", "Failed to finalize epic3 submission", { message }),
      { status: 400 },
    );
  }
}
