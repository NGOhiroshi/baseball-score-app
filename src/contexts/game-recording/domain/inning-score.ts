/**
 * イニングスコア（値オブジェクト）。
 *
 * 各イニングの自チーム/相手の得点。**識別子を持たない値オブジェクト**で、
 * 「3回の 2-0」という値そのものに意味がある（誰の3回かは Game が文脈を与える）。
 *
 * DDD的ポイント:
 *   PlateAppearance（子エンティティ・IDあり）との対比。
 *   イニングスコアは「個別に追跡・更新する対象」ではなく、
 *   試合のスコアボードという値の集合の一部。だから値オブジェクト。
 */
export class InningScore {
  constructor(
    readonly inningNumber: number,
    readonly ourScore: number,
    readonly opponentScore: number,
  ) {
    if (!Number.isInteger(inningNumber) || inningNumber < 1) {
      throw new Error(
        `イニング番号は1以上の整数で指定してください（受信: ${inningNumber}）`,
      );
    }
    if (ourScore < 0 || opponentScore < 0) {
      throw new Error("得点は0以上でなければなりません");
    }
  }
}
