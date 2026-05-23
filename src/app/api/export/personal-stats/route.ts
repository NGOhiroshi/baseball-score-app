import { createClient } from "@/lib/supabase/server";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import { toCsv } from "@/lib/csv";
import { todayStamp, zipResponse } from "../_helpers";

const BATTING_COLUMNS = [
  "player_id",
  "player_kind",
  "player_name",
  "year",
  "plate_appearances",
  "at_bats",
  "hits",
  "home_runs",
  "runs_batted_in",
  "runs_scored",
  "batting_average",
] as const;

const PITCHING_COLUMNS = [
  "player_id",
  "player_kind",
  "player_name",
  "year",
  "full_innings",
  "partial_outs",
  "runs_allowed",
  "earned_runs",
  "hits_allowed",
  "strikeouts",
  "walks_allowed",
  "earned_run_average",
] as const;

/** 個人成績（打撃・投手）の年度別データを ZIP でエクスポート */
export async function GET() {
  const supabase = await createClient();
  const [batting, pitching] = await Promise.all([
    supabase
      .from("v_player_batting_stats_yearly")
      .select(BATTING_COLUMNS.join(","))
      .eq("team_id", SMITH_BROTHERS_TEAM_ID),
    supabase
      .from("v_player_pitching_stats_yearly")
      .select(PITCHING_COLUMNS.join(","))
      .eq("team_id", SMITH_BROTHERS_TEAM_ID),
  ]);
  if (batting.error) throw new Error(batting.error.message);
  if (pitching.error) throw new Error(pitching.error.message);

  return zipResponse(`personal-stats-${todayStamp()}.zip`, {
    "batting.csv": toCsv(
      (batting.data ?? []) as unknown as Record<string, unknown>[],
      [...BATTING_COLUMNS],
    ),
    "pitching.csv": toCsv(
      (pitching.data ?? []) as unknown as Record<string, unknown>[],
      [...PITCHING_COLUMNS],
    ),
  });
}
