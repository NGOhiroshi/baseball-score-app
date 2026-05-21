import { Err, Ok, type Result } from "@/shared/domain/result";
import { BattingOrderEntry } from "../domain/batting-order-entry";
import type { FielderPosition } from "../domain/fielder-position";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import type { PlayerId } from "../domain/player-id";

export type BattingOrderEntryInput = {
  orderNumber: number;
  playerId: PlayerId;
  position?: FielderPosition | null;
};

export type RegisterBattingOrderInput = {
  gameId: GameId;
  entries: BattingOrderEntryInput[];
};

/**
 * 打順登録ユースケース（UC-GAME-2）。
 *
 * 流れ:
 *   1. リポジトリから対象 Game 集約をロード
 *   2. 入力エントリ群をドメインオブジェクトに変換
 *   3. Game.replaceBattingOrder() に渡して**集約のルールで検証**
 *   4. 集約をまるごと保存
 *
 * 重要: 重複チェックや「1人以上」の検証は Game.replaceBattingOrder()
 *       内で行う（ドメインの責務）。ユースケース側では書かない。
 */
export class RegisterBattingOrderUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(
    input: RegisterBattingOrderInput,
  ): Promise<Result<void, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }

      const entries = input.entries.map((e) =>
        BattingOrderEntry.create({
          orderNumber: e.orderNumber,
          playerId: e.playerId,
          position: e.position ?? null,
        }),
      );

      game.replaceBattingOrder(entries);
      await this.gameRepo.save(game);
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
