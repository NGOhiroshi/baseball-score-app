import { Err, Ok, type Result } from "@/shared/domain/result";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type {
  GameResultView,
  StatsRepository,
} from "../domain/stats.repository";
import type { TeamStats } from "../domain/team-stats";

export type TeamSummary = {
  /** 年度別成績（年度昇順）。通算・年度・推移はここから導出 */
  byYear: TeamStats[];
  /** 直近の試合結果（新しい順）。直近フォーム表示用 */
  recent: GameResultView[];
};

const RECENT_LIMIT = 8;

/**
 * チームの年度別成績と直近フォームをまとめて取得する読み取りユースケース。
 */
export class GetTeamSummaryUseCase {
  constructor(private readonly statsRepo: StatsRepository) {}

  async execute(teamId: TeamId): Promise<Result<TeamSummary, Error>> {
    try {
      const [byYear, recent] = await Promise.all([
        this.statsRepo.listTeamStatsByYear(teamId),
        this.statsRepo.listRecentResults(teamId, RECENT_LIMIT),
      ]);
      return Ok({ byYear, recent });
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
