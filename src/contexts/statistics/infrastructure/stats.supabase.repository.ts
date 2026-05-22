import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import { BattingStats } from "../domain/batting-stats";
import { PitchingStats } from "../domain/pitching-stats";
import { TeamStats } from "../domain/team-stats";
import type {
  GameResultView,
  GameOutcome,
  StatsRepository,
} from "../domain/stats.repository";

type BattingRow = {
  player_id: string;
  player_kind: string;
  player_name: string;
  plate_appearances: number;
  at_bats: number;
  hits: number;
  home_runs: number;
  runs_batted_in: number;
  runs_scored: number;
  batting_average: number | null;
};

type PitchingRow = {
  player_id: string;
  player_kind: string;
  player_name: string;
  full_innings: number;
  partial_outs: number;
  runs_allowed: number;
  earned_runs: number;
  hits_allowed: number;
  strikeouts: number;
  walks_allowed: number;
  earned_run_average: number | null;
};

type TeamStatsRow = {
  year: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  plate_appearances: number;
  at_bats: number;
  hits: number;
  home_runs: number;
  runs_batted_in: number;
  runs_scored: number;
  outs: number;
  runs_allowed: number;
  earned_runs: number;
  hits_allowed: number;
  strikeouts: number;
  walks_allowed: number;
};

/**
 * 成績集計の Supabase 実装。
 *
 * 集計ロジックは DB の VIEW が持つので、ここは year の有無で読む VIEW を
 * 選び、行をドメインの Read Model に詰め替えるだけ。
 */
export class StatsSupabaseRepository implements StatsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listBattingStats(
    teamId: TeamId,
    year: number | null,
  ): Promise<BattingStats[]> {
    const view =
      year === null
        ? "v_player_batting_stats_career"
        : "v_player_batting_stats_yearly";
    let query = this.supabase.from(view).select("*").eq("team_id", teamId);
    if (year !== null) query = query.eq("year", year);

    const { data, error } = await query;
    if (error) {
      throw new Error(`打撃成績の取得に失敗しました: ${error.message}`);
    }
    // 並び順はプレゼンテーション層（クライアント）が動的に決めるため、
    // ここでは整形せず取得順のまま返す。
    return (data ?? []).map((row) => {
      const r = row as BattingRow;
      return new BattingStats(
        r.player_id,
        r.player_name,
        r.player_kind === "guest",
        r.plate_appearances,
        r.at_bats,
        r.hits,
        r.home_runs,
        r.runs_batted_in,
        r.runs_scored,
        r.batting_average === null ? null : Number(r.batting_average),
      );
    });
  }

  async listPitchingStats(
    teamId: TeamId,
    year: number | null,
  ): Promise<PitchingStats[]> {
    const view =
      year === null
        ? "v_player_pitching_stats_career"
        : "v_player_pitching_stats_yearly";
    let query = this.supabase.from(view).select("*").eq("team_id", teamId);
    if (year !== null) query = query.eq("year", year);

    const { data, error } = await query;
    if (error) {
      throw new Error(`投手成績の取得に失敗しました: ${error.message}`);
    }
    return (data ?? []).map((row) => {
      const r = row as PitchingRow;
      return new PitchingStats(
        r.player_id,
        r.player_name,
        r.player_kind === "guest",
        r.full_innings,
        r.partial_outs,
        r.runs_allowed,
        r.earned_runs,
        r.hits_allowed,
        r.strikeouts,
        r.walks_allowed,
        r.earned_run_average === null ? null : Number(r.earned_run_average),
      );
    });
  }

  async listRecentResults(
    teamId: TeamId,
    limit: number,
  ): Promise<GameResultView[]> {
    const { data, error } = await this.supabase
      .from("v_game_results")
      .select("opponent_name, our_score, opp_score, result")
      .eq("team_id", teamId)
      .neq("result", "none")
      .order("game_date", { ascending: false })
      .limit(limit);
    if (error) {
      throw new Error(`試合結果の取得に失敗しました: ${error.message}`);
    }
    return (data ?? []).map((row) => {
      const r = row as {
        opponent_name: string;
        our_score: number;
        opp_score: number;
        result: string;
      };
      return {
        opponentName: r.opponent_name,
        ourScore: r.our_score,
        oppScore: r.opp_score,
        outcome: r.result as GameOutcome,
      };
    });
  }

  async listTeamStatsByYear(teamId: TeamId): Promise<TeamStats[]> {
    const { data, error } = await this.supabase
      .from("v_team_stats_by_year")
      .select("*")
      .eq("team_id", teamId)
      .order("year", { ascending: true });
    if (error) {
      throw new Error(`チーム成績の取得に失敗しました: ${error.message}`);
    }
    return (data ?? []).map((row) => {
      const r = row as TeamStatsRow;
      return new TeamStats(
        r.year,
        r.games,
        r.wins,
        r.losses,
        r.draws,
        r.plate_appearances,
        r.at_bats,
        r.hits,
        r.home_runs,
        r.runs_batted_in,
        r.runs_scored,
        r.outs,
        r.runs_allowed,
        r.earned_runs,
        r.hits_allowed,
        r.strikeouts,
        r.walks_allowed,
      );
    });
  }
}
