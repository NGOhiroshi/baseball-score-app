import { Err, Ok, type Result } from "@/shared/domain/result";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import type { PitchingAppearanceId } from "../domain/pitching-appearance-id";

export type DeletePitchingAppearanceInput = {
  gameId: GameId;
  pitchingAppearanceId: PitchingAppearanceId;
};

/** 投手登板の削除ユースケース。 */
export class DeletePitchingAppearanceUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(
    input: DeletePitchingAppearanceInput,
  ): Promise<Result<void, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }
      game.removePitchingAppearance(input.pitchingAppearanceId);
      await this.gameRepo.save(game);
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
