/**
 * チーム成績（読み取りモデル / 値オブジェクト）。
 *
 * 1年度分、または複数年度を合算した「通算」を1インスタンスで表す。
 * 率（打率・防御率）は **合計値から都度計算** する（年度別の率を平均すると
 * 母数が違って狂うため、必ず合計から再計算する）。
 */
export class TeamStats {
  constructor(
    /** 対象年度。null は通算（合算）を表す */
    readonly year: number | null,
    readonly games: number,
    readonly wins: number,
    readonly losses: number,
    readonly draws: number,
    readonly plateAppearances: number,
    readonly atBats: number,
    readonly hits: number,
    readonly homeRuns: number,
    readonly runsBattedIn: number,
    readonly runsScored: number,
    /** 投球アウト総数（投球回 = outs/3） */
    readonly outs: number,
    readonly runsAllowed: number,
    readonly earnedRuns: number,
    readonly hitsAllowed: number,
    readonly strikeouts: number,
    readonly walksAllowed: number,
  ) {}

  get battingAverage(): number | null {
    return this.atBats === 0 ? null : this.hits / this.atBats;
  }

  formatAverage(): string {
    if (this.battingAverage === null) return "-";
    return this.battingAverage.toFixed(3).replace(/^0/, "");
  }

  /** 防御率 = 自責点 × 9 ÷ 投球回 = 自責点 × 27 ÷ アウト数 */
  get earnedRunAverage(): number | null {
    return this.outs === 0 ? null : (this.earnedRuns * 27) / this.outs;
  }

  formatEra(): string {
    if (this.earnedRunAverage === null) return "-";
    return this.earnedRunAverage.toFixed(2);
  }

  formatInningsPitched(): string {
    const full = Math.floor(this.outs / 3);
    const rem = this.outs % 3;
    return rem === 0 ? String(full) : `${full}.${rem}`;
  }

  /** 勝率（引き分けを除外して計算。試合が無ければ null） */
  get winningPercentage(): number | null {
    const decided = this.wins + this.losses;
    return decided === 0 ? null : this.wins / decided;
  }

  formatWinningPercentage(): string {
    if (this.winningPercentage === null) return "-";
    return this.winningPercentage.toFixed(3).replace(/^0/, "");
  }

  /** 複数年度の TeamStats を合算して通算（year=null）を作る */
  static aggregate(list: readonly TeamStats[]): TeamStats {
    const sum = (pick: (s: TeamStats) => number) =>
      list.reduce((acc, s) => acc + pick(s), 0);
    return new TeamStats(
      null,
      sum((s) => s.games),
      sum((s) => s.wins),
      sum((s) => s.losses),
      sum((s) => s.draws),
      sum((s) => s.plateAppearances),
      sum((s) => s.atBats),
      sum((s) => s.hits),
      sum((s) => s.homeRuns),
      sum((s) => s.runsBattedIn),
      sum((s) => s.runsScored),
      sum((s) => s.outs),
      sum((s) => s.runsAllowed),
      sum((s) => s.earnedRuns),
      sum((s) => s.hitsAllowed),
      sum((s) => s.strikeouts),
      sum((s) => s.walksAllowed),
    );
  }

  /** 値が無い（試合・記録ゼロ）通算を表す空インスタンス */
  static empty(): TeamStats {
    return new TeamStats(null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}
