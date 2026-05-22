import { Err, Ok, type Result } from "@/shared/domain/result";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type { BattingStats } from "../domain/batting-stats";
import type { PitchingStats } from "../domain/pitching-stats";
import type { StatsRepository } from "../domain/stats.repository";

export type TeamStats = {
  batting: BattingStats[];
  pitching: PitchingStats[];
};

export type GetTeamStatsInput = {
  teamId: TeamId;
  /** 年度。null なら通算 */
  year: number | null;
};

/**
 * チームの打撃・投手成績をまとめて取得する読み取りユースケース。
 *
 * 集約の更新を伴わない純粋な照会なので、VIEW を読むだけ。
 */
export class GetTeamStatsUseCase {
  constructor(private readonly statsRepo: StatsRepository) {}

  async execute(input: GetTeamStatsInput): Promise<Result<TeamStats, Error>> {
    try {
      const [batting, pitching] = await Promise.all([
        this.statsRepo.listBattingStats(input.teamId, input.year),
        this.statsRepo.listPitchingStats(input.teamId, input.year),
      ]);
      return Ok({ batting, pitching });
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
