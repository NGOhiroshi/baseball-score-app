import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type { BattingStats } from "./batting-stats";
import type { PitchingStats } from "./pitching-stats";
import type { TeamStats } from "./team-stats";

export type GameOutcome = "win" | "loss" | "draw";

export type GameResultView = {
  opponentName: string;
  ourScore: number;
  oppScore: number;
  outcome: GameOutcome;
};

/**
 * 成績集計の読み取りリポジトリ（インターフェース）。
 *
 * year を渡せばその年度、null なら通算を返す。
 * 実装（インフラ層）は対応する DB VIEW を SELECT するだけ。
 */
export interface StatsRepository {
  listBattingStats(teamId: TeamId, year: number | null): Promise<BattingStats[]>;
  listPitchingStats(teamId: TeamId, year: number | null): Promise<PitchingStats[]>;

  /** チームの年度別成績（1行=1年度）。通算・年度・推移はこの配列から導出する。 */
  listTeamStatsByYear(teamId: TeamId): Promise<TeamStats[]>;

  /** 直近の試合結果（スコア入力済みのみ、新しい順、最大 limit 件）。直近フォーム表示用。 */
  listRecentResults(teamId: TeamId, limit: number): Promise<GameResultView[]>;
}
