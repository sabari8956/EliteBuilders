import type { User } from "../platform/store";
import { getStore, nextId, nowIso } from "../platform/store";
import { getSupabaseServerClient, isSupabaseConfigured } from "../platform/supabase";
import { isSupabaseSchemaMissingError } from "../platform/supabase-errors";
import type { Role } from "./roles";

type UserProfileRow = {
  id: string;
  github_handle: string;
  role: Role;
  github_url: string | null;
  portfolio_url: string | null;
  cv_metadata: string | null;
  created_at: string;
};

function mapRowToUser(row: UserProfileRow): User {
  return {
    id: row.id,
    githubHandle: row.github_handle,
    role: row.role,
    createdAt: row.created_at,
    profile:
      row.github_url && row.portfolio_url
        ? {
            githubUrl: row.github_url,
            portfolioUrl: row.portfolio_url,
            cvMetadata: row.cv_metadata ?? undefined,
          }
        : undefined,
  };
}

export async function upsertGithubUser(githubHandle: string, preferredRole: Role): Promise<User> {
  const normalizedHandle = githubHandle.trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    const store = getStore();
    let userId = store.usersByGithub.get(normalizedHandle);

    if (!userId) {
      userId = nextId("usr");
      store.users.set(userId, {
        id: userId,
        githubHandle: normalizedHandle,
        role: preferredRole,
        createdAt: nowIso(),
      });
      store.usersByGithub.set(normalizedHandle, userId);
    }

    return store.users.get(userId)!;
  }

  const supabase = getSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("user_profiles")
    .select("id,github_handle,role,github_url,portfolio_url,cv_metadata,created_at")
    .eq("github_handle", normalizedHandle)
    .maybeSingle<UserProfileRow>();

  if (existingError) {
    if (isSupabaseSchemaMissingError(existingError)) {
      const store = getStore();
      let userId = store.usersByGithub.get(normalizedHandle);

      if (!userId) {
        userId = nextId("usr");
        store.users.set(userId, {
          id: userId,
          githubHandle: normalizedHandle,
          role: preferredRole,
          createdAt: nowIso(),
        });
        store.usersByGithub.set(normalizedHandle, userId);
      }

      return store.users.get(userId)!;
    }

    throw existingError;
  }

  if (existing) {
    const user = mapRowToUser(existing);
    getStore().users.set(user.id, user);
    getStore().usersByGithub.set(normalizedHandle, user.id);
    return user;
  }

  const { data: created, error: createError } = await supabase
    .from("user_profiles")
    .insert({
      github_handle: normalizedHandle,
      role: preferredRole,
    })
    .select("id,github_handle,role,github_url,portfolio_url,cv_metadata,created_at")
    .single<UserProfileRow>();

  if (createError) {
    if (isSupabaseSchemaMissingError(createError)) {
      const store = getStore();
      let userId = store.usersByGithub.get(normalizedHandle);

      if (!userId) {
        userId = nextId("usr");
        store.users.set(userId, {
          id: userId,
          githubHandle: normalizedHandle,
          role: preferredRole,
          createdAt: nowIso(),
        });
        store.usersByGithub.set(normalizedHandle, userId);
      }

      return store.users.get(userId)!;
    }

    throw createError;
  }

  const user = mapRowToUser(created);
  getStore().users.set(user.id, user);
  getStore().usersByGithub.set(normalizedHandle, user.id);
  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  const cached = getStore().users.get(userId);
  if (cached) {
    return cached;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id,github_handle,role,github_url,portfolio_url,cv_metadata,created_at")
    .eq("id", userId)
    .maybeSingle<UserProfileRow>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return null;
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  const user = mapRowToUser(data);
  getStore().users.set(user.id, user);
  getStore().usersByGithub.set(user.githubHandle, user.id);
  return user;
}

export async function updateUserProfile(
  userId: string,
  profile: { githubUrl: string; portfolioUrl: string; cvMetadata?: string },
): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    const store = getStore();
    const user = store.users.get(userId);

    if (!user) {
      return null;
    }

    user.profile = profile;
    store.users.set(userId, user);
    return user;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      github_url: profile.githubUrl,
      portfolio_url: profile.portfolioUrl,
      cv_metadata: profile.cvMetadata ?? null,
    })
    .eq("id", userId)
    .select("id,github_handle,role,github_url,portfolio_url,cv_metadata,created_at")
    .maybeSingle<UserProfileRow>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      const store = getStore();
      const user = store.users.get(userId);
      if (!user) {
        return null;
      }

      user.profile = profile;
      store.users.set(userId, user);
      return user;
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  const user = mapRowToUser(data);
  getStore().users.set(user.id, user);
  return user;
}
