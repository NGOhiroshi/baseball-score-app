import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type { BattingStats } from "./batting-stats";
import type { PitchingStats } from "./pitching-stats";

/**
 * 成績集計の読み取りリポジトリ（インターフェース）。
 *
 * year を渡せばその年度、null なら通算を返す。
 * 実装（インフラ層）は対応する DB VIEW を SELECT するだけ。
 */
export interface StatsRepository {
  listBattingStats(teamId: TeamId, year: number | null): Promise<BattingStats[]>;
  listPitchingStats(teamId: TeamId, year: number | null): Promise<PitchingStats[]>;
}
