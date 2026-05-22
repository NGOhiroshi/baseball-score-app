/**
 * 投手成績（読み取りモデル / 値オブジェクト）。
 *
 * 打撃成績と同じく成績集計コンテキストの Read Model。集計は DB の VIEW が行い、
 * ここは取得済みの数値の整形（投球回 "5.1"、防御率の表示）を担う。
 */
export class PitchingStats {
  constructor(
    /** 選手の識別子（member_id または guest_player_id）。本人ハイライト用 */
    readonly playerId: string,
    readonly playerName: string,
    readonly isGuest: boolean,
    /** 完投イニング数（総アウト ÷ 3） */
    readonly fullInnings: number,
    /** 端数アウト（0/1/2） */
    readonly partialOuts: number,
    readonly runsAllowed: number,
    readonly earnedRuns: number,
    readonly hitsAllowed: number,
    readonly strikeouts: number,
    readonly walksAllowed: number,
    /** 防御率（投球回0なら null） */
    readonly earnedRunAverage: number | null,
  ) {}

  /** 投球回を "5.1"（5回1/3）形式で返す */
  formatInningsPitched(): string {
    return this.partialOuts === 0
      ? String(this.fullInnings)
      : `${this.fullInnings}.${this.partialOuts}`;
  }

  /** 防御率を小数2桁で返す（投球回0は "-"） */
  formatEra(): string {
    if (this.earnedRunAverage === null) return "-";
    return this.earnedRunAverage.toFixed(2);
  }
}
