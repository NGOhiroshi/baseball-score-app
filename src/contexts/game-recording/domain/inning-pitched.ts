/**
 * イニング単位の投球記録（子エンティティ — PitchingAppearance の内部要素）。
 *
 * 草野球では1球ごと・1打席ごとに細かく記録する余裕がないため、
 * 「イニング終了時にそのイニング分をまとめて入力」する。
 * ユーザーがドメインを「イニング単位」で捉えているので、モデルもそれに揃える。
 *
 * 不変条件（このイニング1回分の整合性をここで守る）:
 *   - outsRecorded は 0〜3（3=そのイニングを投げ切った、0〜2=途中降板）
 *   - earnedRuns ≤ runsAllowed（自責点は失点を超えない）
 *   - 各カウントは 0 以上の整数
 */
export class InningPitched {
  constructor(
    readonly inningNumber: number,
    readonly outsRecorded: 0 | 1 | 2 | 3,
    readonly runsAllowed: number,
    readonly earnedRuns: number,
    readonly hitsAllowed: number,
    readonly strikeouts: number,
    readonly walksAllowed: number,
  ) {
    if (!Number.isInteger(inningNumber) || inningNumber < 1) {
      throw new Error(`イニングは1以上の整数で指定してください（受信: ${inningNumber}）`);
    }
    if (!Number.isInteger(outsRecorded) || outsRecorded < 0 || outsRecorded > 3) {
      throw new Error(`アウト数は0〜3で指定してください（受信: ${outsRecorded}）`);
    }
    for (const [label, v] of [
      ["失点", runsAllowed],
      ["自責点", earnedRuns],
      ["被安打", hitsAllowed],
      ["奪三振", strikeouts],
      ["与四死球", walksAllowed],
    ] as const) {
      if (!Number.isInteger(v) || v < 0) {
        throw new Error(`${label}は0以上の整数で指定してください（受信: ${v}）`);
      }
    }
    if (earnedRuns > runsAllowed) {
      throw new Error(
        `自責点は失点を超えられません（自責点: ${earnedRuns}, 失点: ${runsAllowed}）`,
      );
    }
  }
}
