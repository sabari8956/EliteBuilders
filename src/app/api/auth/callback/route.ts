import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import {
  signInOrLinkGithub,
  signInOrLinkGithubFromAccessToken,
  signInOrLinkGithubFromCode,
} from "@/features/auth/oauth";
import { SESSION_COOKIE_NAME } from "@/features/auth/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const accessToken = request.nextUrl.searchParams.get("access_token");
  const githubHandle = request.nextUrl.searchParams.get("githubHandle");
  const role = request.nextUrl.searchParams.get("role") ?? undefined;
  const nextPath = request.nextUrl.searchParams.get("next") ?? "/";

  try {
    const result = code
      ? await signInOrLinkGithubFromCode(code, role)
      : accessToken
        ? await signInOrLinkGithubFromAccessToken(accessToken, role)
        : githubHandle
          ? await signInOrLinkGithub(githubHandle, role)
          : null;

    if (!result) {
      return NextResponse.json(
        fail("INVALID_INPUT", "Missing OAuth code. For local demo mode, pass githubHandle."),
        { status: 400 },
      );
    }

    const isOAuthFlow = Boolean(code || accessToken);
    const response = isOAuthFlow
      ? NextResponse.redirect(new URL(nextPath, request.nextUrl.origin))
      : NextResponse.json(ok({ userId: result.userId }));
    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("GITHUB_OAUTH_CALLBACK_ERROR", error);
    return NextResponse.json(fail("OAUTH_CALLBACK_FAILED", "Unable to complete GitHub OAuth callback."), {
      status: 500,
    });
  }
}
