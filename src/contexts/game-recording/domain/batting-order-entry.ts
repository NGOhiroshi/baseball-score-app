import {
  newBattingOrderEntryId,
  type BattingOrderEntryId,
} from "./batting-order-entry-id";
import type { FielderPosition } from "./fielder-position";
import type { PlayerId } from "./player-id";

/**
 * 打順の1エントリ（子エンティティ）。
 *
 * Game 集約の内部要素。外部からは Game 経由でしか触れない。
 *
 * 不変条件:
 *   - orderNumber は 1 以上（上限なし — 草野球は12人参加もあり得る）
 *   - position は任意（null 許容）
 */
export class BattingOrderEntry {
  private constructor(
    readonly id: BattingOrderEntryId,
    readonly orderNumber: number,
    readonly playerId: PlayerId,
    readonly position: FielderPosition | null,
  ) {
    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      throw new Error(`打順番号は1以上の整数で指定してください（受信: ${orderNumber}）`);
    }
  }

  static create(params: {
    orderNumber: number;
    playerId: PlayerId;
    position?: FielderPosition | null;
  }): BattingOrderEntry {
    return new BattingOrderEntry(
      newBattingOrderEntryId(),
      params.orderNumber,
      params.playerId,
      params.position ?? null,
    );
  }

  static restore(params: {
    id: BattingOrderEntryId;
    orderNumber: number;
    playerId: PlayerId;
    position: FielderPosition | null;
  }): BattingOrderEntry {
    return new BattingOrderEntry(
      params.id,
      params.orderNumber,
      params.playerId,
      params.position,
    );
  }
}
