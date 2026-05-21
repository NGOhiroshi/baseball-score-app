import type { GuestPlayer } from "../domain/guest-player";
import type { GuestPlayerRepository } from "../domain/guest-player.repository";
import type { TeamId } from "../domain/team-id";

/**
 * チームの助っ人選手一覧取得ユースケース。
 * 打順登録時の選手選択肢として使用。
 */
export class ListGuestPlayersUseCase {
  constructor(private readonly repo: GuestPlayerRepository) {}

  async execute(teamId: TeamId): Promise<GuestPlayer[]> {
    return this.repo.findAllByTeam(teamId);
  }
}
