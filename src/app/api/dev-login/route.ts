import { NextResponse } from "next/server";
import { signInOrLinkGithub } from "@/features/auth/oauth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const role = url.searchParams.get("role") || "builder";
    try {
        const { sessionToken } = await signInOrLinkGithub("test_" + role, role);
        const cookieStore = await cookies();
        cookieStore.set("100x_session", sessionToken, { path: "/", httpOnly: true, sameSite: "lax" });
        return NextResponse.redirect(new URL("/", request.url));
    } catch (error) {
        return NextResponse.json({ error: String(error) });
    }
}
