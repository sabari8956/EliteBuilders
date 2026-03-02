import { NextResponse } from "next/server";
import { fail } from "@/lib/api-envelope";

export async function POST() {
  return NextResponse.json(
    fail("DEPRECATED", "The queuing system has been removed. Evaluations start automatically on submission."),
    { status: 410 }
  );
}
