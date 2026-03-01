import { cookies } from "next/headers";
import type { User } from "../platform/store";
import { getStore } from "../platform/store";
import { getUserById } from "./repository";

export const SESSION_COOKIE_NAME = "platform_session";

export async function getSessionUserFromRequest(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const store = getStore();
  const userId = store.sessions.get(token);

  if (!userId) {
    return null;
  }

  const cached = store.users.get(userId);
  if (cached) {
    return cached;
  }

  return getUserById(userId);
}
