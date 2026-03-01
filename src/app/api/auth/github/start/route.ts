import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/features/api/envelope";
import { getGithubAuthorizeUrl } from "@/features/auth/oauth";

export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role") ?? undefined;

  try {
    const authorizeUrl = await getGithubAuthorizeUrl(role);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("GITHUB_OAUTH_START_ERROR", error);
    return NextResponse.json(fail("OAUTH_START_FAILED", "Unable to start GitHub OAuth."), { status: 500 });
  }
}
