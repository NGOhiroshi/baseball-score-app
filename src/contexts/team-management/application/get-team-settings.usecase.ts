import type { TeamId } from "../domain/team-id";
import type { TeamSettings } from "../domain/team-settings";
import type { TeamSettingsRepository } from "../domain/team-settings.repository";

/** チーム設定取得ユースケース（未設定なら既定値）。 */
export class GetTeamSettingsUseCase {
  constructor(private readonly repo: TeamSettingsRepository) {}

  async execute(teamId: TeamId): Promise<TeamSettings> {
    return this.repo.get(teamId);
  }
}
