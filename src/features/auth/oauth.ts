import { createSessionToken } from "../platform/store";
import { getSupabaseServerClient, isSupabaseConfigured } from "../platform/supabase";
import { upsertGithubUser } from "./repository";
import { isRole, type Role } from "./roles";

export function getOAuthCallbackUrl(): string {
  return process.env.GITHUB_CALLBACK_URL ?? "http://localhost:3000/auth/callback";
}

export function buildGithubAuthorizeUrl(role?: string): string {
  const base = process.env.GITHUB_OAUTH_AUTHORIZE_URL ?? "https://github.com/login/oauth/authorize";
  const clientId = process.env.GITHUB_CLIENT_ID ?? "";
  const callback = new URL(getOAuthCallbackUrl());
  if (role) {
    callback.searchParams.set("role", role);
  }
  const url = new URL(base);

  if (!clientId) {
    throw new Error("Missing GITHUB_CLIENT_ID for fallback OAuth URL.");
  }

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("redirect_uri", callback.toString());

  return url.toString();
}

export async function getGithubAuthorizeUrl(role?: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    return buildGithubAuthorizeUrl(role);
  }

  const supabase = getSupabaseServerClient();
  const callback = new URL(getOAuthCallbackUrl());
  if (role) {
    callback.searchParams.set("role", role);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: callback.toString(),
      scopes: "read:user user:email",
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw error ?? new Error("Failed to create GitHub authorize URL.");
  }

  return data.url;
}

export async function signInOrLinkGithub(githubHandle: string, preferredRole?: string): Promise<{
  sessionToken: string;
  userId: string;
}> {
  const role: Role = preferredRole && isRole(preferredRole) ? preferredRole : "builder";
  const user = await upsertGithubUser(githubHandle, role);

  return {
    userId: user.id,
    sessionToken: createSessionToken(user.id),
  };
}

export async function signInOrLinkGithubFromCode(code: string, roleFromState?: string): Promise<{
  sessionToken: string;
  userId: string;
}> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for OAuth code exchange.");
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    throw error ?? new Error("GitHub OAuth code exchange failed.");
  }

  const metadata = data.user.user_metadata ?? {};
  const handle =
    (typeof metadata.user_name === "string" && metadata.user_name) ||
    (typeof metadata.preferred_username === "string" && metadata.preferred_username) ||
    (typeof metadata.login === "string" && metadata.login) ||
    data.user.email?.split("@")[0];

  if (!handle) {
    throw new Error("GitHub user handle not found in OAuth session.");
  }

  return signInOrLinkGithub(handle, roleFromState);
}

export async function signInOrLinkGithubFromAccessToken(
  accessToken: string,
  roleFromState?: string,
): Promise<{
  sessionToken: string;
  userId: string;
}> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for OAuth token lookup.");
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw error ?? new Error("Unable to load GitHub user from access token.");
  }

  const metadata = data.user.user_metadata ?? {};
  const handle =
    (typeof metadata.user_name === "string" && metadata.user_name) ||
    (typeof metadata.preferred_username === "string" && metadata.preferred_username) ||
    (typeof metadata.login === "string" && metadata.login) ||
    data.user.email?.split("@")[0];

  if (!handle) {
    throw new Error("GitHub user handle not found in OAuth user metadata.");
  }

  return signInOrLinkGithub(handle, roleFromState);
}
