import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { challengeCreateSchema } from "@/features/challenges/schema";
import { createChallengeRecord, listChallengeRecords } from "@/features/challenges/repository";

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get("status");
  const deadlineOrderParam = request.nextUrl.searchParams.get("deadlineOrder");
  const mineParam = request.nextUrl.searchParams.get("mine");
  const parsedStatus =
    statusParam === "draft" || statusParam === "published"
      ? (statusParam as "draft" | "published")
      : undefined;
  const mine = mineParam === "true";
  const auth = mine ? await requireAuth(["sponsor", "admin"], "/api/challenges?mine=true") : null;

  if (auth && "response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  const filters: { status?: "draft" | "published"; deadlineOrder: "asc" | "desc"; sponsorId?: string } = {
    status: parsedStatus,
    deadlineOrder: deadlineOrderParam === "desc" ? "desc" : "asc",
    sponsorId: mine && auth && "user" in auth ? auth.user.id : undefined,
  };

  try {
    const challenges = (await listChallengeRecords(filters)).filter((challenge) => {
      if (filters.status) {
        return true;
      }

      return challenge.status === "published";
    });

    return NextResponse.json(ok({ items: challenges, count: challenges.length, filters }));
  } catch (error) {
    console.error("CHALLENGE_LIST_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to load challenges."), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["sponsor", "admin"], "/api/challenges");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = challengeCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid challenge payload.", parsed.error.flatten()), { status: 400 });
  }

  try {
    const challenge = await createChallengeRecord(parsed.data, auth.user);
    return NextResponse.json(ok(challenge), { status: 201 });
  } catch (error) {
    console.error("CHALLENGE_CREATE_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to create challenge."), { status: 500 });
  }
}
