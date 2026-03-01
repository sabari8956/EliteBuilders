import { NextResponse } from "next/server";
import { ok } from "@/features/api/envelope";

export async function GET() {
  return NextResponse.json(ok({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "100x-hackathon-api",
  }));
}
