import { Err, Ok, type Result } from "@/shared/domain/result";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import { PitchingAppearance } from "../domain/pitching-appearance";
import type { PitchingAppearanceId } from "../domain/pitching-appearance-id";
import type { PlayerId } from "../domain/player-id";

export type RecordPitchingAppearanceInput = {
  gameId: GameId;
  pitcherId: PlayerId;
  enteredAtInning: number;
};

/**
 * 投手登板の記録ユースケース。
 *
 * 流れ:
 *   1. Game 集約をロード
 *   2. PitchingAppearance を生成（イニング記録は空からスタート）
 *   3. game.addPitchingAppearance() で **集約の不変条件**（打順登録済みか）を検証
 *   4. 集約をまるごと保存
 */
export class RecordPitchingAppearanceUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(
    input: RecordPitchingAppearanceInput,
  ): Promise<Result<PitchingAppearanceId, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }

      const pa = PitchingAppearance.record({
        pitcherId: input.pitcherId,
        enteredAtInning: input.enteredAtInning,
      });

      game.addPitchingAppearance(pa);
      await this.gameRepo.save(game);
      return Ok(pa.id);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
