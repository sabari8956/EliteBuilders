import { NextResponse } from "next/server";
import { ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";

export async function POST() {
  const auth = await requireAuth(["admin"], "/api/admin/moderation");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  return NextResponse.json(ok({ message: "Moderation action accepted.", actorId: auth.user.id }));
}
