/**
 * 最終スコア（値オブジェクト）。
 *
 * IDを持たず、得点ペアそのものが意味を持つ不変オブジェクト。
 * Game.finalScore() がイニングスコアの合計から生成して返す（DBには保存しない導出値）。
 */
export class Score {
  constructor(
    readonly ourScore: number,
    readonly opponentScore: number,
  ) {
    if (ourScore < 0 || opponentScore < 0) {
      throw new Error("得点は0以上でなければなりません");
    }
  }

  isWin(): boolean {
    return this.ourScore > this.opponentScore;
  }

  isLose(): boolean {
    return this.ourScore < this.opponentScore;
  }

  isDraw(): boolean {
    return this.ourScore === this.opponentScore;
  }

  /** "○" / "●" / "△" の結果記号 */
  resultMark(): string {
    if (this.isWin()) return "○";
    if (this.isLose()) return "●";
    return "△";
  }
}
