/**
 * 投球回（値オブジェクト）。
 *
 * 野球の投球回は「3アウトで1イニング」。途中降板すると 1/3・2/3 が出るため、
 * 慣習的に "5.1"（5回1/3）, "5.2"（5回2/3）と表記する。
 *
 * 総アウト数という1つの真実から導出する値オブジェクトなので、
 * completeInnings と partialOuts を別々に持って不整合になることはない。
 */
export class InningsPitched {
  private constructor(
    /** 完投したイニング数（総アウト数 ÷ 3 の商） */
    readonly completeInnings: number,
    /** 端数のアウト数（0/1/2） */
    readonly partialOuts: 0 | 1 | 2,
  ) {}

  /** 総アウト数から生成（唯一の生成経路） */
  static fromOuts(totalOuts: number): InningsPitched {
    if (!Number.isInteger(totalOuts) || totalOuts < 0) {
      throw new Error(`総アウト数は0以上の整数で指定してください（受信: ${totalOuts}）`);
    }
    return new InningsPitched(
      Math.floor(totalOuts / 3),
      (totalOuts % 3) as 0 | 1 | 2,
    );
  }

  /** 総アウト数（防御率などの計算で使う） */
  get totalOuts(): number {
    return this.completeInnings * 3 + this.partialOuts;
  }

  /** "5.1" 形式の表示用文字列 */
  toString(): string {
    return this.partialOuts === 0
      ? String(this.completeInnings)
      : `${this.completeInnings}.${this.partialOuts}`;
  }
}
