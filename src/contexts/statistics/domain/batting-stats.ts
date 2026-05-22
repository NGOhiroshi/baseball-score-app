/**
 * 打撃成績（読み取りモデル / 値オブジェクト）。
 *
 * 成績集計コンテキストは「集約」を持たない。打席や登板といった事実は
 * 試合記録コンテキストが管理し、ここはそれを **読み取って集計した結果** を
 * 表現するだけ（CQRS でいう Read Model）。
 *
 * 集計そのものは DB の VIEW が行う。このクラスは取得済みの数値を受け取り、
 * 表示用の整形（打率の ".300" 表記など）という小さなドメイン知識を持つ。
 */
export class BattingStats {
  constructor(
    /** 選手の識別子（member_id または guest_player_id）。本人ハイライト用 */
    readonly playerId: string,
    readonly playerName: string,
    readonly isGuest: boolean,
    readonly plateAppearances: number,
    readonly atBats: number,
    readonly hits: number,
    readonly homeRuns: number,
    readonly runsBattedIn: number,
    readonly runsScored: number,
    /** 打率（打数0なら null）。0〜1 の数値。 */
    readonly battingAverage: number | null,
  ) {}

  /** 打率を野球慣習の ".300" 形式で返す（打数0は "-"） */
  formatAverage(): string {
    if (this.battingAverage === null) return "-";
    return this.battingAverage.toFixed(3).replace(/^0/, "");
  }
}
