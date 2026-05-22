import type { InningPitched } from "./inning-pitched";
import { InningsPitched } from "./innings-pitched";
import {
  newPitchingAppearanceId,
  type PitchingAppearanceId,
} from "./pitching-appearance-id";
import type { PlayerId } from "./player-id";

/**
 * 投手登板（子エンティティ）。Game 集約の内部要素。
 *
 * 1試合での1人の投手の登板を表す。リリーフ交代があれば
 * 1試合に複数の PitchingAppearance が並ぶ。
 *
 * 合計値（投球回・奪三振・被安打など）は inningRecords から **導出** し、
 * 直接フィールドとして持たない（二重保持による不整合を構造的に排除）。
 *
 * 不変条件:
 *   - enteredAtInning は 1 以上
 *   - inningRecords の inningNumber は重複しない
 */
export class PitchingAppearance {
  private constructor(
    readonly id: PitchingAppearanceId,
    readonly pitcherId: PlayerId,
    readonly enteredAtInning: number,
    private readonly _inningRecords: readonly InningPitched[],
  ) {
    if (!Number.isInteger(enteredAtInning) || enteredAtInning < 1) {
      throw new Error(
        `登板開始イニングは1以上の整数で指定してください（受信: ${enteredAtInning}）`,
      );
    }
    const nums = _inningRecords.map((r) => r.inningNumber);
    if (new Set(nums).size !== nums.length) {
      throw new Error("同じイニングの投球記録が重複しています");
    }
  }

  static record(params: {
    pitcherId: PlayerId;
    enteredAtInning: number;
    inningRecords?: readonly InningPitched[];
  }): PitchingAppearance {
    return new PitchingAppearance(
      newPitchingAppearanceId(),
      params.pitcherId,
      params.enteredAtInning,
      [...(params.inningRecords ?? [])].sort(
        (a, b) => a.inningNumber - b.inningNumber,
      ),
    );
  }

  static restore(params: {
    id: PitchingAppearanceId;
    pitcherId: PlayerId;
    enteredAtInning: number;
    inningRecords: readonly InningPitched[];
  }): PitchingAppearance {
    return new PitchingAppearance(
      params.id,
      params.pitcherId,
      params.enteredAtInning,
      [...params.inningRecords].sort(
        (a, b) => a.inningNumber - b.inningNumber,
      ),
    );
  }

  get inningRecords(): readonly InningPitched[] {
    return this._inningRecords;
  }

  /**
   * イニング記録だけ差し替えた新しいインスタンスを返す（不変更新）。
   * ID は同じなので集約から見れば「同一登板の記録が更新された」と扱える。
   */
  withInningRecords(records: readonly InningPitched[]): PitchingAppearance {
    return new PitchingAppearance(
      this.id,
      this.pitcherId,
      this.enteredAtInning,
      [...records].sort((a, b) => a.inningNumber - b.inningNumber),
    );
  }

  // --- 派生値（inningRecords から計算） ---

  inningsPitched(): InningsPitched {
    const totalOuts = this._inningRecords.reduce(
      (s, r) => s + r.outsRecorded,
      0,
    );
    return InningsPitched.fromOuts(totalOuts);
  }

  totalRunsAllowed(): number {
    return this._inningRecords.reduce((s, r) => s + r.runsAllowed, 0);
  }

  totalEarnedRuns(): number {
    return this._inningRecords.reduce((s, r) => s + r.earnedRuns, 0);
  }

  totalHitsAllowed(): number {
    return this._inningRecords.reduce((s, r) => s + r.hitsAllowed, 0);
  }

  totalStrikeouts(): number {
    return this._inningRecords.reduce((s, r) => s + r.strikeouts, 0);
  }

  totalWalksAllowed(): number {
    return this._inningRecords.reduce((s, r) => s + r.walksAllowed, 0);
  }
}
