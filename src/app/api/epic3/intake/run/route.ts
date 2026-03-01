import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { runRepoIntake } from "@/features/evaluation/repo-intake";
import { fail, ok } from "@/lib/api-envelope";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runRepoIntake(body);
    return NextResponse.json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", "Invalid intake payload", error.flatten()),
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown intake pipeline error";
    return NextResponse.json(
      fail("EPIC3_INTAKE_FAILED", "Repo intake evaluation failed", { message }),
      { status: 500 },
    );
  }
}
