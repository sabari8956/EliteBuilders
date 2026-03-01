import { fail } from "../api/envelope";
import { nowIso, getStore, type User } from "../platform/store";
import { getSessionUserFromRequest } from "./session";
import type { Role } from "./roles";

export type AuthResult = {
  user: User;
} | {
  response: ReturnType<typeof fail>;
  status: number;
};

export async function requireAuth(allowedRoles?: Role[], path = "unknown"): Promise<AuthResult> {
  const user = await getSessionUserFromRequest();

  if (!user) {
    return {
      response: fail("AUTH_REQUIRED", "Authentication is required."),
      status: 401,
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const store = getStore();
    store.audits.push({
      at: nowIso(),
      type: "unauthorized",
      path,
      actorUserId: user.id,
      requiredRoles: allowedRoles,
    });

    console.warn(`[AUTHZ_BLOCKED] path=${path} user=${user.id} role=${user.role} required=${allowedRoles.join(",")}`);

    return {
      response: fail("FORBIDDEN", "You are not allowed to perform this action."),
      status: 403,
    };
  }

  return { user };
}
