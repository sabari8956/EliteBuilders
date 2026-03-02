import { NextResponse, after } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { getSubmissionRecord } from "@/features/submissions/repository";
import { queueSubmissionForEvaluation } from "@/features/evaluation/store";
import { evaluateSubmission } from "@/features/evaluation/worker";
import { getStore } from "@/features/platform/store";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["builder", "admin"], "/api/submissions/[id]/evaluate");
  if ("response" in auth) return NextResponse.json(auth.response, { status: auth.status });

  const { id } = await params;

  const submission = await getSubmissionRecord(id).catch(() => null);
  if (!submission) {
    return NextResponse.json(fail("NOT_FOUND", "Submission not found."), { status: 404 });
  }

  // Queue in Epic3 (idempotent — safe to call even if already registered)
  try {
    const platformChallenge = getStore().challenges.get(submission.challengeId);
    await queueSubmissionForEvaluation({
      submissionId: submission.id,
      challengeId: submission.challengeId,
      challengeTitle: platformChallenge?.title ?? submission.challengeId,
      challengeRubric: platformChallenge?.rubric ?? {},
      builderId: submission.builderId,
      repoUrl: submission.snapshotRef,
    });
  } catch (err) {
    console.error("EPIC3_QUEUE_ERROR", err);
    return NextResponse.json(fail("INTERNAL_ERROR", "Failed to queue evaluation."), { status: 500 });
  }

  // Start the evaluation immediately but safely in the background
  after(() => {
    evaluateSubmission(id).catch((err: unknown) => console.error("AUTO_EVAL_ERROR", err));
  });

  return NextResponse.json(ok({ status: "started", submissionId: id }));
}
