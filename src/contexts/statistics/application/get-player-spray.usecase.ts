import { Err, Ok, type Result } from "@/shared/domain/result";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type {
  PlayerSprayRow,
  StatsRepository,
} from "../domain/stats.repository";

/**
 * 選手×年度の打球分布を取得する読み取りユースケース。
 * 通算・年度の出し分けはプレゼンテーション層で配列から導出する。
 */
export class GetPlayerSprayUseCase {
  constructor(private readonly statsRepo: StatsRepository) {}

  async execute(teamId: TeamId): Promise<Result<PlayerSprayRow[], Error>> {
    try {
      return Ok(await this.statsRepo.listPlayerSprayByYear(teamId));
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
