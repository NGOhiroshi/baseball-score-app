import { Err, Ok, type Result } from "@/shared/domain/result";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";

export type SetBatsFirstInput = {
  gameId: GameId;
  batsFirst: boolean;
};

/**
 * 先攻/後攻の切り替えユースケース。
 */
export class SetBatsFirstUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(input: SetBatsFirstInput): Promise<Result<void, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }
      game.setBatsFirst(input.batsFirst);
      await this.gameRepo.save(game);
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
