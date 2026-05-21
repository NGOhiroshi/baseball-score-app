import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type { Game } from "../domain/game";
import type { GameRepository } from "../domain/game.repository";

/**
 * 試合一覧ユースケース（UC-GAME-7）。
 */
export class ListGamesUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(teamId: TeamId): Promise<Game[]> {
    return this.gameRepo.findAllByTeam(teamId);
  }
}
