import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-envelope";
import { runWorkerOnce } from "@/features/evaluation/worker";

export async function POST() {
  try {
    const result = await runWorkerOnce();
    return NextResponse.json(ok(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    return NextResponse.json(
      fail("WORKER_RUN_FAILED", "Failed to run epic3 worker", { message }),
      { status: 500 },
    );
  }
}
