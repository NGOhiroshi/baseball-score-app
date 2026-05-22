import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type { BattingOrderEntry } from "./batting-order-entry";
import { newGameId, type GameId } from "./game-id";
import type { InningScore } from "./inning-score";
import type { PlateAppearance } from "./plate-appearance";
import type { PlateAppearanceId } from "./plate-appearance-id";
import { samePlayer, type PlayerId } from "./player-id";
import { Score } from "./score";

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
    private _plateAppearances: readonly PlateAppearance[],
    private _inningScores: readonly InningScore[],
    private _batsFirst: boolean,
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

  /** 新規試合の作成（打順・打席は空からスタート） */
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
      [],
      [],
      true, // デフォルトは先攻
    );
  }

  /** リポジトリから永続化済みデータを復元 */
  static restore(params: {
    id: GameId;
    teamId: TeamId;
    gameDate: Date;
    opponentName: string;
    battingOrder: readonly BattingOrderEntry[];
    plateAppearances: readonly PlateAppearance[];
    inningScores: readonly InningScore[];
    batsFirst: boolean;
  }): Game {
    return new Game(
      params.id,
      params.teamId,
      params.gameDate,
      params.opponentName,
      params.battingOrder,
      params.plateAppearances,
      params.inningScores,
      params.batsFirst,
    );
  }

  /** 打順は読み取り専用で外に公開（変更は専用メソッド経由） */
  get battingOrder(): readonly BattingOrderEntry[] {
    return this._battingOrder;
  }

  /** 打席結果は読み取り専用で外に公開（変更は専用メソッド経由） */
  get plateAppearances(): readonly PlateAppearance[] {
    return this._plateAppearances;
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

  /**
   * 打席結果を追加する。
   *
   * 集約の不変条件:
   *   打席結果は「打順に登録された選手」にのみ記録できる。
   *   （打順にいない選手の打席はあり得ない）
   */
  addPlateAppearance(pa: PlateAppearance): void {
    if (!this.isPlayerInBattingOrder(pa.playerId)) {
      throw new Error(
        "打席結果は打順に登録された選手にのみ記録できます",
      );
    }
    this._plateAppearances = [...this._plateAppearances, pa];
  }

  /** 打席結果を削除する */
  removePlateAppearance(id: PlateAppearanceId): void {
    this._plateAppearances = this._plateAppearances.filter(
      (pa) => pa.id !== id,
    );
  }

  /**
   * 指定した打席の「得点したか」フラグを更新する。
   * 出塁後にホームインしたことを後から記録するためのピンポイント更新。
   */
  setRunScored(id: PlateAppearanceId, runScored: boolean): void {
    this._plateAppearances = this._plateAppearances.map((pa) =>
      pa.id === id ? pa.withRunScored(runScored) : pa,
    );
  }

  private isPlayerInBattingOrder(playerId: PlayerId): boolean {
    return this._battingOrder.some((e) => samePlayer(e.playerId, playerId));
  }

  /** イニングスコアは読み取り専用で外に公開（変更は専用メソッド経由） */
  get inningScores(): readonly InningScore[] {
    return this._inningScores;
  }

  /**
   * イニングスコアをまるごと差し替える。
   *
   * 集約の不変条件:
   *   イニング番号が重複しない（空は許容＝まだスコア未入力の試合）
   */
  replaceInningScores(scores: readonly InningScore[]): void {
    const nums = scores.map((s) => s.inningNumber);
    if (new Set(nums).size !== nums.length) {
      throw new Error("イニング番号が重複しています");
    }
    this._inningScores = [...scores].sort(
      (a, b) => a.inningNumber - b.inningNumber,
    );
  }

  /**
   * 最終スコアを **導出** する（状態として保持しない）。
   *
   * DDD的ポイント:
   *   最終スコアを独立フィールドで持つと inningScores と不整合になり得る。
   *   常にイニングスコアの合計から計算することで、二重保持による
   *   バグを構造的に排除する（Single Source of Truth）。
   */
  finalScore(): Score {
    const our = this._inningScores.reduce((sum, s) => sum + s.ourScore, 0);
    const opponent = this._inningScores.reduce(
      (sum, s) => sum + s.opponentScore,
      0,
    );
    return new Score(our, opponent);
  }

  /** 自軍が先攻か（true=先攻/表、false=後攻/裏） */
  get batsFirst(): boolean {
    return this._batsFirst;
  }

  setBatsFirst(value: boolean): void {
    this._batsFirst = value;
  }
}
