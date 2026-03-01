import { NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { getSubmissionRecord } from "@/features/submissions/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(undefined, "/api/submissions/:id");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  const { id } = await context.params;
  let submission = null;
  try {
    submission = await getSubmissionRecord(id);
  } catch (error) {
    console.error("SUBMISSION_READ_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to load submission."), { status: 500 });
  }

  if (!submission) {
    return NextResponse.json(fail("NOT_FOUND", "Submission not found."), { status: 404 });
  }

  if (auth.user.role !== "admin" && auth.user.id !== submission.builderId) {
    return NextResponse.json(fail("FORBIDDEN", "You cannot access this submission."), { status: 403 });
  }

  return NextResponse.json(ok(submission));
}
