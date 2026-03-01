import { NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { updateUserProfile } from "@/features/auth/repository";
import { profileSchema } from "@/features/profile/schema";

export async function GET() {
  const auth = await requireAuth(undefined, "/api/profile");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  return NextResponse.json(
    ok({
      userId: auth.user.id,
      githubHandle: auth.user.githubHandle,
      role: auth.user.role,
      profile: auth.user.profile ?? null,
    }),
  );
}

export async function PUT(request: Request) {
  const auth = await requireAuth(undefined, "/api/profile");

  if ("response" in auth) {
    return NextResponse.json(auth.response, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid profile payload.", parsed.error.flatten()), { status: 400 });
  }

  try {
    const user = await updateUserProfile(auth.user.id, parsed.data);

    if (!user) {
      return NextResponse.json(fail("NOT_FOUND", "User not found."), { status: 404 });
    }

    return NextResponse.json(ok({ userId: user.id, profile: user.profile }));
  } catch (error) {
    console.error("PROFILE_UPDATE_ERROR", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "Unable to update profile at this time."), { status: 500 });
  }
}
