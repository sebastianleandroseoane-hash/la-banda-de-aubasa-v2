import { supabase } from "../../supabase/supabase";

export function parseScorers(input: string) {
  if (!input) return [];

  const counter = new Map<string, number>();

  input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((name) => {
      counter.set(name, (counter.get(name) || 0) + 1);
    });

  const parsed = [...counter.entries()].map(([player_name, goals]) => ({
    player_name,
    goals,
  }));

  console.log("PARSED SCORERS:", parsed);

  return parsed;
}

export async function replaceScorers(matchId: string | number, goles: string) {
  const numericMatchId = Number(matchId);

  console.log("REPLACE SCORERS matchId:", numericMatchId);
  console.log("REPLACE SCORERS goles input:", goles);

  const { error: deleteError } = await supabase
    .from("scorers")
    .delete()
    .eq("match_id", numericMatchId);

  if (deleteError) {
    console.error("SUPABASE DELETE SCORERS ERROR:", deleteError);
    throw new Error(deleteError.message || JSON.stringify(deleteError));
  }

  const parsed = parseScorers(goles);

  if (!parsed.length) {
    console.log("NO SCORERS TO INSERT");
    return;
  }

  const rows = parsed.map((s) => ({
    match_id: numericMatchId,
    player_name: s.player_name,
    goals: s.goals,
  }));

  console.log("SCORERS ROWS TO INSERT:", rows);

  const { data, error: insertError } = await supabase
    .from("scorers")
    .insert(rows)
    .select();

  if (insertError) {
    console.error("SUPABASE INSERT SCORERS ERROR:", insertError);
    throw new Error(insertError.message || JSON.stringify(insertError));
  }

  console.log("SCORERS INSERTED:", data);
}