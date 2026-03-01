import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-envelope";
import { getWorkerSnapshot } from "@/features/evaluation/worker";

export async function GET() {
  try {
    const snapshot = await getWorkerSnapshot();
    return NextResponse.json(ok(snapshot));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker snapshot error";
    return NextResponse.json(
      fail("WORKER_SNAPSHOT_FAILED", "Failed to load epic3 worker snapshot", { message }),
      { status: 500 },
    );
  }
}
