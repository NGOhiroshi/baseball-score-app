import { Err, Ok, type Result } from "@/shared/domain/result";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import type { PlateAppearanceId } from "../domain/plate-appearance-id";

export type DeletePlateAppearanceInput = {
  gameId: GameId;
  plateAppearanceId: PlateAppearanceId;
};

/**
 * 打席結果削除ユースケース（入力ミス修正用）。
 */
export class DeletePlateAppearanceUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(
    input: DeletePlateAppearanceInput,
  ): Promise<Result<void, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }
      game.removePlateAppearance(input.plateAppearanceId);
      await this.gameRepo.save(game);
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
