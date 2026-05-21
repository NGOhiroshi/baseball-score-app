import { Err, Ok, type Result } from "@/shared/domain/result";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import type { PlateAppearanceId } from "../domain/plate-appearance-id";

export type SetRunScoredInput = {
  gameId: GameId;
  plateAppearanceId: PlateAppearanceId;
  runScored: boolean;
};

/**
 * 打席の得点フラグ更新ユースケース（UC-GAME-3 の一部）。
 * 出塁後にホームインしたことを後から記録する。
 */
export class SetRunScoredUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(input: SetRunScoredInput): Promise<Result<void, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }
      game.setRunScored(input.plateAppearanceId, input.runScored);
      await this.gameRepo.save(game);
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
