import { NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { submissionCreateSchema } from "@/features/submissions/schema";
import { createSubmissionRecord } from "@/features/submissions/repository";

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

  return NextResponse.json(ok(result.submission), { status: 201 });
}
