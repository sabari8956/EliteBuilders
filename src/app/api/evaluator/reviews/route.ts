import { NextResponse } from "next/server";
import { ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";

export async function POST() {
  const auth = await requireAuth(["evaluator", "admin"], "/api/evaluator/reviews");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  return NextResponse.json(ok({ message: "Review endpoint access granted.", actorId: auth.user.id }));
}
