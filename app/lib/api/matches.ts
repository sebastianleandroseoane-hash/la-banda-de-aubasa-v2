import { supabase } from "../../supabase/supabase";
import type { MatchRow, MatchPhotoRow, ScorerRow } from "../../types/index";

const BUCKET = "match-photos";

type MatchDbRow = Omit<MatchRow, "match_photos" | "scorers">;

type ScorerDbRow = {
  id: string;
  match_id: string;
  player_name: string;
  goals: number;
};

type PhotoDbRow = {
  id: string;
  match_id: string;
  photo_url: string;
};

type MatchPayload = Partial<MatchRow>;

function sanitizeMatchPayload(payload: MatchPayload) {
  const cleaned = { ...payload } as Record<string, unknown>;

  delete cleaned.match_photos;
  delete cleaned.scorers;

  return cleaned;
}

function buildPublicUrl(path: string) {
  if (!path) return "";

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

export async function getMatches(): Promise<MatchRow[]> {
  const [
    { data: matches, error: matchesError },
    { data: scorers, error: scorersError },
    { data: photos, error: photosError },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .order("fecha_partido", { ascending: true }),
    supabase.from("scorers").select("id, match_id, player_name, goals"),
    supabase.from("match_photos").select("id, match_id, photo_url"),
  ]);

  if (matchesError) {
    console.error("MATCHES ERROR:", matchesError);
    console.error("message:", matchesError.message);
    console.error("details:", matchesError.details);
    console.error("hint:", matchesError.hint);
    console.error("code:", matchesError.code);
    throw matchesError;
  }

  if (scorersError) {
    console.error("SCORERS ERROR:", scorersError);
    console.error("message:", scorersError.message);
    console.error("details:", scorersError.details);
    console.error("hint:", scorersError.hint);
    console.error("code:", scorersError.code);
    throw scorersError;
  }

  if (photosError) {
    console.error("PHOTOS ERROR:", photosError);
    console.error("message:", photosError.message);
    console.error("details:", photosError.details);
    console.error("hint:", photosError.hint);
    console.error("code:", photosError.code);
    throw photosError;
  }

  const scorersByMatch = new Map<string, ScorerRow[]>();
  const photosByMatch = new Map<string, MatchPhotoRow[]>();

  for (const scorer of (scorers ?? []) as ScorerDbRow[]) {
    const current = scorersByMatch.get(scorer.match_id) ?? [];
    current.push({
      id: scorer.id,
      match_id: scorer.match_id,
      player_name: scorer.player_name,
      goals: scorer.goals,
    });
    scorersByMatch.set(scorer.match_id, current);
  }

  for (const photo of (photos ?? []) as PhotoDbRow[]) {
    const current = photosByMatch.get(photo.match_id) ?? [];
    current.push({
      id: photo.id,
      match_id: photo.match_id,
      photo_url: photo.photo_url,
      public_url: buildPublicUrl(photo.photo_url),
    });
    photosByMatch.set(photo.match_id, current);
  }

  return ((matches ?? []) as MatchDbRow[]).map((match) => ({
    ...match,
    scorers: scorersByMatch.get(match.id) ?? [],
    match_photos: photosByMatch.get(match.id) ?? [],
  })) as MatchRow[];
}

export async function createMatch(payload: MatchPayload): Promise<MatchRow> {
  const insertPayload = sanitizeMatchPayload(payload);

  const { data, error } = await supabase
    .from("matches")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("CREATE MATCH ERROR:", error);
    console.error("message:", error.message);
    console.error("details:", error.details);
    console.error("hint:", error.hint);
    console.error("code:", error.code);
    throw error;
  }

  return {
    ...(data as MatchRow),
    scorers: [],
    match_photos: [],
  };
}

export async function updateMatch(
  id: string,
  payload: MatchPayload
): Promise<MatchRow> {
  const updatePayload = sanitizeMatchPayload(payload);

  const { data, error } = await supabase
    .from("matches")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("UPDATE MATCH ERROR:", error);
    console.error("message:", error.message);
    console.error("details:", error.details);
    console.error("hint:", error.hint);
    console.error("code:", error.code);
    throw error;
  }

  return {
    ...(data as MatchRow),
    scorers: [],
    match_photos: [],
  };
}