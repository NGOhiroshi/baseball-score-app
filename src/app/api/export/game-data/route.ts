import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { todayStamp, zipResponse } from "../_helpers";

const GAMES = [
  "id",
  "team_id",
  "game_date",
  "opponent_name",
  "bats_first",
] as const;
const BATTING_ORDER = [
  "id",
  "game_id",
  "order_number",
  "member_id",
  "guest_player_id",
  "position",
] as const;
const PLATE_APPEARANCES = [
  "id",
  "game_id",
  "member_id",
  "guest_player_id",
  "inning",
  "sequence_in_inning",
  "result_category",
  "hit_type",
  "walk_type",
  "out_type",
  "sacrifice_type",
  "had_error",
  "batting_direction",
  "fielder_position",
  "runs_batted_in",
  "run_scored",
] as const;
const PITCHING_APPEARANCES = [
  "id",
  "game_id",
  "pitcher_member_id",
  "pitcher_guest_player_id",
  "entered_at_inning",
] as const;
const INNING_PITCHED = [
  "id",
  "pitching_appearance_id",
  "inning_number",
  "outs_recorded",
  "runs_allowed",
  "earned_runs",
  "hits_allowed",
  "strikeouts",
  "walks_allowed",
] as const;
const INNING_SCORES = [
  "id",
  "game_id",
  "inning_number",
  "our_score",
  "opponent_score",
] as const;
const GUEST_PLAYERS = ["id", "team_id", "name"] as const;

/**
 * 試合データ一式の ZIP エクスポート。
 *
 * 単一チーム MVP 前提。RLS によりログイン中メンバーは自チームの行のみ取得できる
 * ので、明示的な team_id フィルタは不要（RLS が境界）。
 */
export async function GET() {
  const supabase = await createClient();

  const [games, order, pa, pap, ipr, scores, guests] = await Promise.all([
    supabase.from("games").select(GAMES.join(",")),
    supabase.from("batting_order_entries").select(BATTING_ORDER.join(",")),
    supabase.from("plate_appearances").select(PLATE_APPEARANCES.join(",")),
    supabase.from("pitching_appearances").select(PITCHING_APPEARANCES.join(",")),
    supabase.from("inning_pitched_records").select(INNING_PITCHED.join(",")),
    supabase.from("inning_scores").select(INNING_SCORES.join(",")),
    supabase.from("guest_players").select(GUEST_PLAYERS.join(",")),
  ]);
  if (games.error) throw new Error(games.error.message);
  if (order.error) throw new Error(order.error.message);
  if (pa.error) throw new Error(pa.error.message);
  if (pap.error) throw new Error(pap.error.message);
  if (ipr.error) throw new Error(ipr.error.message);
  if (scores.error) throw new Error(scores.error.message);
  if (guests.error) throw new Error(guests.error.message);

  type Row = Record<string, unknown>;
  return zipResponse(`game-data-${todayStamp()}.zip`, {
    "games.csv": toCsv((games.data ?? []) as unknown as Row[], [...GAMES]),
    "batting_order_entries.csv": toCsv(
      (order.data ?? []) as unknown as Row[],
      [...BATTING_ORDER],
    ),
    "plate_appearances.csv": toCsv(
      (pa.data ?? []) as unknown as Row[],
      [...PLATE_APPEARANCES],
    ),
    "pitching_appearances.csv": toCsv(
      (pap.data ?? []) as unknown as Row[],
      [...PITCHING_APPEARANCES],
    ),
    "inning_pitched_records.csv": toCsv(
      (ipr.data ?? []) as unknown as Row[],
      [...INNING_PITCHED],
    ),
    "inning_scores.csv": toCsv((scores.data ?? []) as unknown as Row[], [...INNING_SCORES]),
    "guest_players.csv": toCsv((guests.data ?? []) as unknown as Row[], [...GUEST_PLAYERS]),
  });
}
