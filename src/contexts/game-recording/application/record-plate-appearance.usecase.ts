import { Err, Ok, type Result } from "@/shared/domain/result";
import { buildBatResult, type BatResultRaw } from "../domain/bat-result";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import { PlateAppearance } from "../domain/plate-appearance";
import type { PlateAppearanceId } from "../domain/plate-appearance-id";
import type { PlayerId } from "../domain/player-id";

export type RecordPlateAppearanceInput = {
  gameId: GameId;
  playerId: PlayerId;
  inning: number;
  result: BatResultRaw;
  runsBattedIn?: number;
  runScored?: boolean;
};

/**
 * 打席結果記録ユースケース（UC-GAME-3）。
 *
 * 流れ:
 *   1. Game 集約をロード
 *   2. 生入力から BatResult 値オブジェクトを構築（不正な組み合わせは例外）
 *   3. PlateAppearance を生成
 *   4. game.addPlateAppearance() で **集約の不変条件**（打順登録済み選手か）を検証
 *   5. 集約をまるごと保存
 */
export class RecordPlateAppearanceUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(
    input: RecordPlateAppearanceInput,
  ): Promise<Result<PlateAppearanceId, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }

      const result = buildBatResult(input.result);
      const pa = PlateAppearance.record({
        playerId: input.playerId,
        inning: input.inning,
        result,
        runsBattedIn: input.runsBattedIn,
        runScored: input.runScored,
      });

      game.addPlateAppearance(pa);
      await this.gameRepo.save(game);
      return Ok(pa.id);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
