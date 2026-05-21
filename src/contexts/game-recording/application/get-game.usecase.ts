import type { Game } from "../domain/game";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";

/**
 * 試合詳細取得ユースケース（UC-GAME-6 の主要部分）。
 * 集約まるごと（打順含む）取得して返す。
 */
export class GetGameUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(id: GameId): Promise<Game | null> {
    return this.gameRepo.findById(id);
  }
}
