/**
 * チーム設定（値オブジェクト）。
 *
 * 成績のタイトルホルダー判定に使う「規定打席・規定投球回」の係数を持つ。
 *   規定打席   = 試合数 × qualifiedPaPerGame
 *   規定投球回 = 試合数 × qualifiedInningsPerGame
 *
 * 不変条件: 各係数は 0 より大きく 10 以下（極端な値を弾く）。
 */
export class TeamSettings {
  constructor(
    readonly qualifiedPaPerGame: number,
    readonly qualifiedInningsPerGame: number,
  ) {
    for (const [label, v] of [
      ["規定打席係数", qualifiedPaPerGame],
      ["規定投球回係数", qualifiedInningsPerGame],
    ] as const) {
      if (!Number.isFinite(v) || v <= 0 || v > 10) {
        throw new Error(`${label}は0より大きく10以下で指定してください（受信: ${v}）`);
      }
    }
  }

  static default(): TeamSettings {
    return new TeamSettings(1, 1);
  }
}
