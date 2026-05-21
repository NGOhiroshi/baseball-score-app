import type { BatResult } from "./bat-result";
import {
  newPlateAppearanceId,
  type PlateAppearanceId,
} from "./plate-appearance-id";
import type { PlayerId } from "./player-id";

/**
 * 打席（子エンティティ）。Game 集約の内部要素。
 *
 * 1回の打席機会の記録:
 *   - playerId: 誰の打席か
 *   - inning: 何回の打席か
 *   - result: 打席結果（値オブジェクト BatResult）
 *   - runsBattedIn: 打点（手動入力）
 *   - runScored: この打席で出塁後にホームへ帰ったか（手動入力、後から編集可）
 *
 * 不変条件:
 *   - inning は 1 以上
 *   - runsBattedIn は 0 以上
 */
export class PlateAppearance {
  private constructor(
    readonly id: PlateAppearanceId,
    readonly playerId: PlayerId,
    readonly inning: number,
    readonly result: BatResult,
    readonly runsBattedIn: number,
    readonly runScored: boolean,
  ) {
    if (!Number.isInteger(inning) || inning < 1) {
      throw new Error(`イニングは1以上の整数で指定してください（受信: ${inning}）`);
    }
    if (!Number.isInteger(runsBattedIn) || runsBattedIn < 0) {
      throw new Error(`打点は0以上の整数で指定してください（受信: ${runsBattedIn}）`);
    }
  }

  static record(params: {
    playerId: PlayerId;
    inning: number;
    result: BatResult;
    runsBattedIn?: number;
    runScored?: boolean;
  }): PlateAppearance {
    return new PlateAppearance(
      newPlateAppearanceId(),
      params.playerId,
      params.inning,
      params.result,
      params.runsBattedIn ?? 0,
      params.runScored ?? false,
    );
  }

  static restore(params: {
    id: PlateAppearanceId;
    playerId: PlayerId;
    inning: number;
    result: BatResult;
    runsBattedIn: number;
    runScored: boolean;
  }): PlateAppearance {
    return new PlateAppearance(
      params.id,
      params.playerId,
      params.inning,
      params.result,
      params.runsBattedIn,
      params.runScored,
    );
  }

  /**
   * 得点フラグだけ変更した新しいインスタンスを返す（不変更新）。
   *
   * エンティティは原則イミュータブルに保ち、変更は「新しい値で作り直す」。
   * ID は同じなので、集約から見れば「同一の打席が更新された」と扱える。
   * 出塁後にホームへ帰ったことが後から判明するケースに対応。
   */
  withRunScored(runScored: boolean): PlateAppearance {
    return new PlateAppearance(
      this.id,
      this.playerId,
      this.inning,
      this.result,
      this.runsBattedIn,
      runScored,
    );
  }
}
