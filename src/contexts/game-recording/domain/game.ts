import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type { BattingOrderEntry } from "./batting-order-entry";
import { newGameId, type GameId } from "./game-id";

const MAX_OPPONENT_LENGTH = 50;

/**
 * 試合（集約ルート）。
 *
 * Phase 1-D Slice 2 では BattingOrderEntry のみを子として持つ。
 * Slice 3 以降で PlateAppearance, InningScore, PitchingAppearance を追加する。
 *
 * DDD的ポイント（集約の本質）:
 *   - 試合中のデータ整合性を 1 単位として守る境界
 *   - 子（BattingOrderEntry 等）への参照・変更は **集約ルート（Game）経由のみ**
 *   - 外部からは `game.replaceBattingOrder(...)` を呼ぶ。
 *     子エンティティを直接 new して save するような操作は禁止
 *   - 集約の不変条件（打順番号の重複禁止など）はこのクラスが守る
 */
export class Game {
  private constructor(
    readonly id: GameId,
    readonly teamId: TeamId,
    readonly gameDate: Date,
    readonly opponentName: string,
    private _battingOrder: readonly BattingOrderEntry[],
  ) {
    if (opponentName.trim() === "") {
      throw new Error("対戦相手名は必須です");
    }
    if (opponentName.length > MAX_OPPONENT_LENGTH) {
      throw new Error(
        `対戦相手名は${MAX_OPPONENT_LENGTH}文字以内で入力してください`,
      );
    }
  }

  /** 新規試合の作成（打順は空からスタート） */
  static create(params: {
    teamId: TeamId;
    gameDate: Date;
    opponentName: string;
  }): Game {
    return new Game(
      newGameId(),
      params.teamId,
      params.gameDate,
      params.opponentName.trim(),
      [],
    );
  }

  /** リポジトリから永続化済みデータを復元 */
  static restore(params: {
    id: GameId;
    teamId: TeamId;
    gameDate: Date;
    opponentName: string;
    battingOrder: readonly BattingOrderEntry[];
  }): Game {
    return new Game(
      params.id,
      params.teamId,
      params.gameDate,
      params.opponentName,
      params.battingOrder,
    );
  }

  /** 打順は読み取り専用で外に公開（変更は専用メソッド経由） */
  get battingOrder(): readonly BattingOrderEntry[] {
    return this._battingOrder;
  }

  /**
   * 打順をまるごと差し替える。
   *
   * 集約の不変条件（このメソッドが守る）:
   *   - 1人以上
   *   - 打順番号が重複しない
   *
   * 注: 「差し替え」セマンティクスにしたのは、UC-GAME-2 が
   *     「打順を再構成して保存」という一括操作だから（行の追加・削除を
   *      個別管理せず、毎回 N 行を確定する形）。
   */
  replaceBattingOrder(entries: readonly BattingOrderEntry[]): void {
    if (entries.length === 0) {
      throw new Error("打順には最低1人の選手が必要です");
    }
    const orderNumbers = entries.map((e) => e.orderNumber);
    const uniqueCount = new Set(orderNumbers).size;
    if (uniqueCount !== orderNumbers.length) {
      throw new Error("打順番号が重複しています");
    }
    // 内部表現は orderNumber 昇順で保つ
    this._battingOrder = [...entries].sort(
      (a, b) => a.orderNumber - b.orderNumber,
    );
  }
}
