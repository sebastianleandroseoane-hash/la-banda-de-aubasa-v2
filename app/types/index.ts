export type MatchResult = "Pendiente" | "Ganado" | "Empatado" | "Perdido";

export type ScorerRow = {
  id: string;
  match_id: string;
  player_name: string;
  goals: number;
};

export type MatchPhotoRow = {
  id: string;
  match_id: string;
  storage_path: string;
  public_url: string;
};

export type MatchRow = {
  id: string;
  rival: string;
  fecha: string;
  fecha_partido: string;
  resultado: MatchResult;
  goles_a_favor: number;
  goles_en_contra: number;
  goles?: string | null;
  created_at?: string | null;
  scorers: ScorerRow[];
  match_photos: MatchPhotoRow[];
};

export type MatchForm = {
  rival: string;
  fecha: string;
  fecha_partido: string;
  resultado: MatchResult;
  goles_a_favor: number;
  goles_en_contra: number;
  goles: string;
};