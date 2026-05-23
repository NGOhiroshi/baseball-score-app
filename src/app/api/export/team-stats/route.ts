import { createClient } from "@/lib/supabase/server";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import { toCsv } from "@/lib/csv";
import { csvResponse, todayStamp } from "../_helpers";

const COLUMNS = [
  "year",
  "games",
  "wins",
  "losses",
  "draws",
  "plate_appearances",
  "at_bats",
  "hits",
  "home_runs",
  "runs_batted_in",
  "runs_scored",
  "outs",
  "runs_allowed",
  "earned_runs",
  "hits_allowed",
  "strikeouts",
  "walks_allowed",
] as const;

/** チーム成績（年度別）の CSV エクスポート */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_team_stats_by_year")
    .select(COLUMNS.join(","))
    .eq("team_id", SMITH_BROTHERS_TEAM_ID)
    .order("year", { ascending: true });
  if (error) throw new Error(error.message);

  return csvResponse(
    `team-stats-${todayStamp()}.csv`,
    toCsv((data ?? []) as unknown as Record<string, unknown>[], [...COLUMNS]),
  );
}
