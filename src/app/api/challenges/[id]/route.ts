import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { deleteChallengeRecord, getChallengeRecord, updateChallengeRecord } from "@/features/challenges/repository";
import { challengeUpdateSchema } from "@/features/challenges/schema";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const challenge = await getChallengeRecord(id);
    if (!challenge) {
      return NextResponse.json(fail("NOT_FOUND", "Challenge not found."), { status: 404 });
    }
    return NextResponse.json(ok(challenge));
  } catch (error) {
    console.error("CHALLENGE_READ_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to load challenge."), { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["sponsor", "admin"], "/api/challenges/:id");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = challengeUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid challenge update payload.", parsed.error.flatten()), { status: 400 });
  }

  const { id } = await context.params;
  let challenge = null;
  try {
    challenge = await updateChallengeRecord(id, parsed.data, auth.user);
  } catch (error) {
    console.error("CHALLENGE_UPDATE_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to update challenge."), { status: 500 });
  }

  if (!challenge) {
    return NextResponse.json(fail("NOT_FOUND", "Challenge not found or not editable by this user."), { status: 404 });
  }

  return NextResponse.json(ok(challenge));
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["sponsor", "admin"], "/api/challenges/:id");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  const { id } = await context.params;
  try {
    const result = await deleteChallengeRecord(id, auth.user);
    if (result.error === "NOT_FOUND") {
      return NextResponse.json(fail("NOT_FOUND", "Challenge not found."), { status: 404 });
    }
    if (result.error === "FORBIDDEN") {
      return NextResponse.json(fail("FORBIDDEN", "Challenge cannot be deleted by this user."), { status: 403 });
    }
    if (result.error === "INVALID_STATE") {
      return NextResponse.json(fail("INVALID_STATE", "Only draft challenges can be deleted."), { status: 409 });
    }

    return NextResponse.json(ok({ deleted: true }));
  } catch (error) {
    console.error("CHALLENGE_DELETE_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to delete challenge."), { status: 500 });
  }
}
