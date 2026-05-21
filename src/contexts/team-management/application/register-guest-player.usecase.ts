import { Err, Ok, type Result } from "@/shared/domain/result";
import { GuestPlayer } from "../domain/guest-player";
import type { GuestPlayerId } from "../domain/guest-player-id";
import type { GuestPlayerRepository } from "../domain/guest-player.repository";
import type { TeamId } from "../domain/team-id";

export type RegisterGuestPlayerInput = {
  teamId: TeamId;
  name: string;
};

/**
 * 助っ人選手の臨時登録ユースケース（UC-TEAM-4）。
 */
export class RegisterGuestPlayerUseCase {
  constructor(private readonly repo: GuestPlayerRepository) {}

  async execute(
    input: RegisterGuestPlayerInput,
  ): Promise<Result<GuestPlayerId, Error>> {
    try {
      const guest = GuestPlayer.register({
        teamId: input.teamId,
        name: input.name,
      });
      await this.repo.save(guest);
      return Ok(guest.id);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
