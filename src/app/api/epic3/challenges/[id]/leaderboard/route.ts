import { NextResponse } from "next/server";
import { z } from "zod";
import { projectLeaderboard } from "@/features/evaluation/leaderboard";
import { getDatabase } from "@/features/evaluation/store";
import { fail, ok } from "@/lib/api-envelope";

const querySchema = z.object({
  mode: z.enum(["provisional", "final"]).default("provisional"),
});

type Params = { id: string };

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const parsed = querySchema.parse({ mode: url.searchParams.get("mode") ?? undefined });

    const db = await getDatabase();
    const challenge = db.challenges.find((entry) => entry.id === id);
    if (!challenge) {
      return NextResponse.json(
        fail("CHALLENGE_NOT_FOUND", `Challenge ${id} was not found.`),
        { status: 404 },
      );
    }

    const entries = projectLeaderboard(db.submissions, id, parsed.mode);

    return NextResponse.json(
      ok({
        challenge: { id: challenge.id, title: challenge.title },
        mode: parsed.mode,
        entries,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", "Invalid leaderboard query", error.flatten()),
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown leaderboard error";
    return NextResponse.json(
      fail("LEADERBOARD_READ_FAILED", "Failed to load epic3 leaderboard", { message }),
      { status: 500 },
    );
  }
}
