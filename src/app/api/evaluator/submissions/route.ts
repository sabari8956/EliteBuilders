import { NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { listSubmissionRecords } from "@/features/submissions/repository";

export async function GET() {
  const auth = await requireAuth(["evaluator", "admin"], "/api/evaluator/submissions");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  try {
    const items = await listSubmissionRecords({ status: "awaiting_human_review" });
    return NextResponse.json(ok({ items, count: items.length }));
  } catch (error) {
    console.error("EVALUATOR_SUBMISSION_LIST_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to list submissions."), { status: 500 });
  }
}
