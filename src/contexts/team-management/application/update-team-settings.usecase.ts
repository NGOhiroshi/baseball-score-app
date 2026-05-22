import { Err, Ok, type Result } from "@/shared/domain/result";
import type { TeamId } from "../domain/team-id";
import { TeamSettings } from "../domain/team-settings";
import type { TeamSettingsRepository } from "../domain/team-settings.repository";

export type UpdateTeamSettingsInput = {
  teamId: TeamId;
  qualifiedPaPerGame: number;
  qualifiedInningsPerGame: number;
};

/**
 * チーム設定更新ユースケース。
 * 生入力から TeamSettings を構築する時点で不変条件（係数の範囲）が検証される。
 */
export class UpdateTeamSettingsUseCase {
  constructor(private readonly repo: TeamSettingsRepository) {}

  async execute(input: UpdateTeamSettingsInput): Promise<Result<void, Error>> {
    try {
      const settings = new TeamSettings(
        input.qualifiedPaPerGame,
        input.qualifiedInningsPerGame,
      );
      await this.repo.save(input.teamId, settings);
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
