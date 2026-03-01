import type { User } from "../platform/store";
import {
  createChallenge as createLocalChallenge,
  deleteChallenge as deleteLocalChallenge,
  getChallenge as getLocalChallenge,
  listChallenges as listLocalChallenges,
  publishChallenge as publishLocalChallenge,
  updateChallenge as updateLocalChallenge,
} from "./service";
import { getSupabaseServerClient, isSupabaseConfigured } from "../platform/supabase";
import { isSupabaseSchemaMissingError } from "../platform/supabase-errors";

type ChallengeRow = {
  id: string;
  title: string;
  brief: string;
  rubric: Record<string, unknown>;
  deadline: string;
  prize: string | null;
  sponsor_id: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type ChallengeRecord = {
  id: string;
  title: string;
  brief: string;
  rubric: Record<string, unknown>;
  deadline: string;
  prize?: string;
  sponsorId: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

function mapRow(row: ChallengeRow): ChallengeRecord {
  return {
    id: row.id,
    title: row.title,
    brief: row.brief,
    rubric: row.rubric,
    deadline: row.deadline,
    prize: row.prize ?? undefined,
    sponsorId: row.sponsor_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

export async function createChallengeRecord(
  input: {
    title: string;
    brief: string;
    rubric: Record<string, unknown>;
    deadline: string;
    prize?: string;
  },
  sponsor: User,
): Promise<ChallengeRecord> {
  if (!isSupabaseConfigured()) {
    return createLocalChallenge(input, sponsor);
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("challenges")
    .insert({
      title: input.title,
      brief: input.brief,
      rubric: input.rubric,
      deadline: input.deadline,
      prize: input.prize ?? null,
      sponsor_id: sponsor.id,
      status: "draft",
    })
    .select("id,title,brief,rubric,deadline,prize,sponsor_id,status,created_at,updated_at,published_at")
    .single<ChallengeRow>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return createLocalChallenge(input, sponsor);
    }

    throw error;
  }

  return mapRow(data);
}

export async function listChallengeRecords(filters: {
  status?: "draft" | "published";
  deadlineOrder: "asc" | "desc";
  sponsorId?: string;
}): Promise<ChallengeRecord[]> {
  if (!isSupabaseConfigured()) {
    return listLocalChallenges(filters).filter((item) => (filters.sponsorId ? item.sponsorId === filters.sponsorId : true));
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("challenges")
    .select("id,title,brief,rubric,deadline,prize,sponsor_id,status,created_at,updated_at,published_at")
    .order("deadline", { ascending: filters.deadlineOrder === "asc" });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.sponsorId) {
    query = query.eq("sponsor_id", filters.sponsorId);
  }

  const { data, error } = await query.returns<ChallengeRow[]>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return listLocalChallenges(filters).filter((item) => (filters.sponsorId ? item.sponsorId === filters.sponsorId : true));
    }

    throw error;
  }

  return (data ?? []).map(mapRow);
}

export async function getChallengeRecord(id: string): Promise<ChallengeRecord | null> {
  if (!isSupabaseConfigured()) {
    return getLocalChallenge(id);
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("id,title,brief,rubric,deadline,prize,sponsor_id,status,created_at,updated_at,published_at")
    .eq("id", id)
    .maybeSingle<ChallengeRow>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return getLocalChallenge(id);
    }

    throw error;
  }

  return data ? mapRow(data) : null;
}

export async function updateChallengeRecord(
  id: string,
  patch: Partial<{ title: string; brief: string; rubric: Record<string, unknown>; deadline: string; prize?: string }>,
  actor: User,
): Promise<ChallengeRecord | null> {
  if (!isSupabaseConfigured()) {
    return updateLocalChallenge(id, patch, actor);
  }

  const supabase = getSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("challenges")
    .select("id,sponsor_id")
    .eq("id", id)
    .maybeSingle<{ id: string; sponsor_id: string }>();

  if (existingError) {
    if (isSupabaseSchemaMissingError(existingError)) {
      return updateLocalChallenge(id, patch, actor);
    }

    throw existingError;
  }

  if (!existing) {
    return null;
  }

  if (actor.role !== "admin" && existing.sponsor_id !== actor.id) {
    return null;
  }

  const payload = {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.brief !== undefined ? { brief: patch.brief } : {}),
    ...(patch.rubric !== undefined ? { rubric: patch.rubric } : {}),
    ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
    ...(patch.prize !== undefined ? { prize: patch.prize || null } : {}),
  };

  const { data, error } = await supabase
    .from("challenges")
    .update(payload)
    .eq("id", id)
    .select("id,title,brief,rubric,deadline,prize,sponsor_id,status,created_at,updated_at,published_at")
    .maybeSingle<ChallengeRow>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return updateLocalChallenge(id, patch, actor);
    }

    throw error;
  }

  return data ? mapRow(data) : null;
}

export async function publishChallengeRecord(id: string, actor: User): Promise<{ challenge?: ChallengeRecord; error?: "NOT_FOUND" | "FORBIDDEN" | "INVALID_TRANSITION" }> {
  if (!isSupabaseConfigured()) {
    const local = publishLocalChallenge(id, actor);
    if (local.error === "NOT_FOUND" || local.error === "FORBIDDEN" || local.error === "INVALID_TRANSITION") {
      return { error: local.error };
    }

    return local.challenge ? { challenge: local.challenge } : { error: "NOT_FOUND" };
  }

  const supabase = getSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("challenges")
    .select("id,title,brief,rubric,deadline,prize,sponsor_id,status,created_at,updated_at,published_at")
    .eq("id", id)
    .maybeSingle<ChallengeRow>();

  if (existingError) {
    if (isSupabaseSchemaMissingError(existingError)) {
      const local = publishLocalChallenge(id, actor);
      if (local.error === "NOT_FOUND" || local.error === "FORBIDDEN" || local.error === "INVALID_TRANSITION") {
        return { error: local.error };
      }

      return local.challenge ? { challenge: local.challenge } : { error: "NOT_FOUND" };
    }

    throw existingError;
  }

  if (!existing) {
    return { error: "NOT_FOUND" };
  }

  if (actor.role !== "admin" && existing.sponsor_id !== actor.id) {
    return { error: "FORBIDDEN" };
  }

  if (existing.status !== "draft") {
    return { error: "INVALID_TRANSITION" };
  }

  const { data, error } = await supabase
    .from("challenges")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,title,brief,rubric,deadline,prize,sponsor_id,status,created_at,updated_at,published_at")
    .single<ChallengeRow>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      const local = publishLocalChallenge(id, actor);
      if (local.error === "NOT_FOUND" || local.error === "FORBIDDEN" || local.error === "INVALID_TRANSITION") {
        return { error: local.error };
      }

      return local.challenge ? { challenge: local.challenge } : { error: "NOT_FOUND" };
    }

    throw error;
  }

  return { challenge: mapRow(data) };
}

export async function deleteChallengeRecord(
  id: string,
  actor: User,
): Promise<{ deleted?: boolean; error?: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" }> {
  if (!isSupabaseConfigured()) {
    return deleteLocalChallenge(id, actor);
  }

  const supabase = getSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("challenges")
    .select("id,sponsor_id,status")
    .eq("id", id)
    .maybeSingle<{ id: string; sponsor_id: string; status: "draft" | "published" }>();

  if (existingError) {
    if (isSupabaseSchemaMissingError(existingError)) {
      return deleteLocalChallenge(id, actor);
    }

    throw existingError;
  }

  if (!existing) {
    return { error: "NOT_FOUND" };
  }

  if (actor.role !== "admin" && existing.sponsor_id !== actor.id) {
    return { error: "FORBIDDEN" };
  }

  if (existing.status !== "draft") {
    return { error: "INVALID_STATE" };
  }

  const { error } = await supabase.from("challenges").delete().eq("id", id);

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return deleteLocalChallenge(id, actor);
    }

    throw error;
  }

  return { deleted: true };
}
