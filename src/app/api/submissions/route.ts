import { NextResponse, after } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { submissionCreateSchema } from "@/features/submissions/schema";
import { createSubmissionRecord, listSubmissionRecords } from "@/features/submissions/repository";
import { queueSubmissionForEvaluation } from "@/features/evaluation/store";
import { getChallengeRecord } from "@/features/challenges/repository";
import { evaluateSubmission } from "@/features/evaluation/worker";

export async function GET() {
  const auth = await requireAuth(["builder", "admin"], "/api/submissions");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  try {
    const builderId = auth.user.role === "admin" ? undefined : auth.user.id;
    const items = await listSubmissionRecords({ builderId });
    return NextResponse.json(ok({ items, count: items.length }));
  } catch (error) {
    console.error("SUBMISSION_LIST_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to list submissions."), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["builder", "admin"], "/api/submissions");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = submissionCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid submission payload.", parsed.error.flatten()), { status: 400 });
  }

  let result;
  try {
    result = await createSubmissionRecord(parsed.data, auth.user);
  } catch (error) {
    console.error("SUBMISSION_CREATE_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to create submission."), { status: 500 });
  }

  if (result.error === "CHALLENGE_UNAVAILABLE") {
    return NextResponse.json(fail("CHALLENGE_UNAVAILABLE", "Challenge is missing or not published."), { status: 400 });
  }

  // Queue in Epic3 then immediately start the evaluation in the background
  try {
    const sub = result.submission!;
    // Use Supabase-aware getChallengeRecord so the rubric is correct even in serverless
    const platformChallenge = await getChallengeRecord(sub.challengeId).catch(() => null);
    await queueSubmissionForEvaluation({
      submissionId: sub.id,
      challengeId: sub.challengeId,
      challengeTitle: platformChallenge?.title ?? sub.challengeId,
      challengeRubric: platformChallenge?.rubric ?? {},
      builderId: sub.builderId,
      repoUrl: sub.snapshotRef,
    });

    // Evaluate the submission automatically and immediately right after the 
    // HTTP response is sent back, ensuring near-instantaneous feedback.
    after(() => {
      evaluateSubmission(sub.id).catch((err: unknown) => console.error("AUTO_EVAL_ERROR", err));
    });
  } catch (err) {
    console.error("EPIC3_QUEUE_ERROR", err);
  }

  return NextResponse.json(ok(result.submission), { status: 201 });
}
