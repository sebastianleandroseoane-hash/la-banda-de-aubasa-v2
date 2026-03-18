import { supabase } from "../../supabase/supabase";
import type { MatchRow, MatchPhotoRow, ScorerRow } from "../../types/index";

type MatchDbRow = Omit<MatchRow, "match_photos" | "scorers"> & {
  scorers?: Array<{
    id: string;
    match_id: string;
    player_name: string;
    goals: number;
  }>;
};

type PhotoDbRow = {
  id: string;
  match_id: string;
  photo_url: string;
};

export async function getMatches(): Promise<MatchRow[]> {
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(`
      *,
      scorers!scorers_match_fk (
        id,
        match_id,
        player_name,
        goals
      )
    `)
    .order("fecha_partido", { ascending: true });

  if (matchesError) {
    console.error("MATCHES ERROR:", matchesError);
    console.error("message:", matchesError.message);
    console.error("details:", matchesError.details);
    console.error("hint:", matchesError.hint);
    console.error("code:", matchesError.code);
    throw matchesError;
  }

  const { data: photos, error: photosError } = await supabase
    .from("match_photos")
    .select("id, match_id, photo_url");

  if (photosError) {
    console.error("PHOTOS ERROR:", photosError);
    console.error("message:", photosError.message);
    console.error("details:", photosError.details);
    console.error("hint:", photosError.hint);
    console.error("code:", photosError.code);
    throw photosError;
  }

  const photosByMatch: Record<string, MatchPhotoRow[]> = {};

  for (const photo of (photos ?? []) as PhotoDbRow[]) {
    const { data } = supabase.storage
      .from("match-photos")
      .getPublicUrl(photo.photo_url);

      const photoWithUrl: MatchPhotoRow = {
        id: photo.id,
        match_id: photo.match_id,
        storage_path: photo.photo_url,
        public_url: data.publicUrl,
      };

    if (!photosByMatch[photo.match_id]) {
      photosByMatch[photo.match_id] = [];
    }

    photosByMatch[photo.match_id].push(photoWithUrl);
  }

  const merged: MatchRow[] = ((matches ?? []) as MatchDbRow[]).map((match) => ({
    ...match,
    scorers: (match.scorers ?? []) as ScorerRow[],
    match_photos: photosByMatch[String(match.id)] ?? [],
  }));

  return merged;
}

export async function createMatch(match: Partial<MatchRow>): Promise<MatchRow> {
  const { data, error } = await supabase
    .from("matches")
    .insert(match)
    .select()
    .single();

  if (error) {
    console.error("SUPABASE CREATE MATCH ERROR RAW:", error);
    console.error("message:", error.message);
    console.error("details:", error.details);
    console.error("hint:", error.hint);
    console.error("code:", error.code);
    throw error;
  }

  return data as MatchRow;
}

export async function updateMatch(
  id: string,
  patch: Partial<MatchRow>
): Promise<void> {
  const { error } = await supabase.from("matches").update(patch).eq("id", id);

  if (error) {
    console.error("SUPABASE UPDATE MATCH ERROR RAW:", error);
    console.error("message:", error.message);
    console.error("details:", error.details);
    console.error("hint:", error.hint);
    console.error("code:", error.code);
    throw error;
  }
}