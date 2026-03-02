import type { User } from "../platform/store";
import { createSubmission as createLocalSubmission, getSubmission as getLocalSubmission, listSubmissions as listLocalSubmissions } from "./service";
import { getSupabaseServerClient, isSupabaseConfigured } from "../platform/supabase";
import { isSupabaseSchemaMissingError } from "../platform/supabase-errors";

type SubmissionRow = {
  id: string;
  challenge_id: string;
  builder_id: string;
  snapshot_ref: string;
  status: "draft" | "submitted" | "queued" | "running" | "ai_scored" | "awaiting_human_review" | "finalized" | "failed" | "disqualified";
  created_at: string;
  updated_at: string;
};

export type SubmissionRecord = {
  id: string;
  challengeId: string;
  builderId: string;
  snapshotRef: string;
  status: SubmissionRow["status"];
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: SubmissionRow): SubmissionRecord {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    builderId: row.builder_id,
    snapshotRef: row.snapshot_ref,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createSubmissionRecord(
  input: { challengeId: string; snapshotRef: string },
  builder: User,
): Promise<{ submission?: SubmissionRecord; error?: "CHALLENGE_UNAVAILABLE" }> {
  if (!isSupabaseConfigured()) {
    const local = createLocalSubmission(input, builder);
    if (local.error === "CHALLENGE_UNAVAILABLE") {
      return { error: local.error };
    }

    return local.submission ? { submission: local.submission } : { error: "CHALLENGE_UNAVAILABLE" };
  }

  const supabase = getSupabaseServerClient();
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id,status")
    .eq("id", input.challengeId)
    .maybeSingle<{ id: string; status: string }>();

  if (challengeError) {
    if (isSupabaseSchemaMissingError(challengeError)) {
      const local = createLocalSubmission(input, builder);
      if (local.error === "CHALLENGE_UNAVAILABLE") {
        return { error: local.error };
      }

      return local.submission ? { submission: local.submission } : { error: "CHALLENGE_UNAVAILABLE" };
    }

    throw challengeError;
  }

  if (!challenge || challenge.status !== "published") {
    return { error: "CHALLENGE_UNAVAILABLE" };
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      challenge_id: input.challengeId,
      builder_id: builder.id,
      snapshot_ref: input.snapshotRef,
      status: "queued",
    })
    .select("id,challenge_id,builder_id,snapshot_ref,status,created_at,updated_at")
    .single<SubmissionRow>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      const local = createLocalSubmission(input, builder);
      if (local.error === "CHALLENGE_UNAVAILABLE") {
        return { error: local.error };
      }

      return local.submission ? { submission: local.submission } : { error: "CHALLENGE_UNAVAILABLE" };
    }

    throw error;
  }

  return { submission: mapRow(data) };
}

export async function listSubmissionRecords(filters: { builderId?: string; challengeId?: string; status?: SubmissionRow["status"] }): Promise<SubmissionRecord[]> {
  if (!isSupabaseConfigured()) {
    return listLocalSubmissions(filters) as SubmissionRecord[];
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("submissions")
    .select("id,challenge_id,builder_id,snapshot_ref,status,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (filters.builderId) query = query.eq("builder_id", filters.builderId);
  if (filters.challengeId) query = query.eq("challenge_id", filters.challengeId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query.returns<SubmissionRow[]>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return listLocalSubmissions(filters) as SubmissionRecord[];
    }
    throw error;
  }

  return (data ?? []).map(mapRow);
}

export async function getSubmissionRecord(id: string): Promise<SubmissionRecord | null> {
  if (!isSupabaseConfigured()) {
    return getLocalSubmission(id);
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id,challenge_id,builder_id,snapshot_ref,status,created_at,updated_at")
    .eq("id", id)
    .maybeSingle<SubmissionRow>();

  if (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return getLocalSubmission(id);
    }

    throw error;
  }

  return data ? mapRow(data) : null;
}
