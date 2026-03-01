import { NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { publishChallengeRecord } from "@/features/challenges/repository";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["sponsor", "admin"], "/api/challenges/:id/publish");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  const { id } = await context.params;
  let result;
  try {
    result = await publishChallengeRecord(id, auth.user);
  } catch (error) {
    console.error("CHALLENGE_PUBLISH_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to publish challenge."), { status: 500 });
  }

  if (result.error === "NOT_FOUND") {
    return NextResponse.json(fail("NOT_FOUND", "Challenge not found."), { status: 404 });
  }

  if (result.error === "FORBIDDEN") {
    return NextResponse.json(fail("FORBIDDEN", "Challenge cannot be published by this user."), { status: 403 });
  }

  if (result.error === "INVALID_TRANSITION") {
    return NextResponse.json(fail("INVALID_TRANSITION", "Challenge is not in draft state."), { status: 409 });
  }

  return NextResponse.json(ok(result.challenge));
}
