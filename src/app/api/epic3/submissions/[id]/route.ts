import { NextResponse } from "next/server";
import { getDatabase } from "@/features/evaluation/store";
import { fail, ok } from "@/lib/api-envelope";

type Params = { id: string };

export async function GET(
  _request: Request,
  context: { params: Promise<Params> },
) {
  try {
    const { id } = await context.params;
    const db = await getDatabase();

    const submission = db.submissions.find((entry) => entry.id === id);
    if (!submission) {
      return NextResponse.json(
        fail("SUBMISSION_NOT_FOUND", `Submission ${id} was not found.`),
        { status: 404 },
      );
    }

    const report = db.reports.find((entry) => entry.submission_id === id) ?? null;

    return NextResponse.json(
      ok({
        submission,
        report,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown submission load error";
    return NextResponse.json(
      fail("SUBMISSION_READ_FAILED", "Failed to load epic3 submission", { message }),
      { status: 500 },
    );
  }
}
