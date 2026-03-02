import { NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { listSubmissionRecords } from "@/features/submissions/repository";

/**
 * GET /api/evaluator/reviews
 * Returns submissions in ai_scored or awaiting_human_review states,
 * representing the full human-review backlog (scored by AI, not yet finalized).
 */
export async function GET() {
  const auth = await requireAuth(["evaluator", "admin"], "/api/evaluator/reviews");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  try {
    const [aiScored, awaitingReview] = await Promise.all([
      listSubmissionRecords({ status: "ai_scored" }),
      listSubmissionRecords({ status: "awaiting_human_review" }),
    ]);

    const items = [...awaitingReview, ...aiScored];
    return NextResponse.json(ok({ items, count: items.length }));
  } catch (error) {
    console.error("EVALUATOR_REVIEWS_LIST_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to list review queue."), { status: 500 });
  }
}

/**
 * POST /api/evaluator/reviews
 * Not the finalization endpoint — use POST /api/submissions/:id/finalize instead.
 */
export async function POST() {
  const auth = await requireAuth(["evaluator", "admin"], "/api/evaluator/reviews");
  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  return NextResponse.json(
    fail("USE_FINALIZE_ENDPOINT", "To finalize a submission, POST to /api/submissions/:id/finalize."),
    { status: 405 },
  );
}
