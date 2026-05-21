/**
 * 守備位置（値オブジェクト）。
 *
 * 1: 投手, 2: 捕手, 3: 一塁, 4: 二塁, 5: 三塁,
 * 6: 遊撃, 7: 左翼, 8: 中堅, 9: 右翼
 *
 * 草野球では試合中に頻繁にポジションが変わるため、打順登録時の指定は任意。
 * したがって `FielderPosition | null` を許容する場面が多い。
 */
export type FielderPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function isFielderPosition(n: number): n is FielderPosition {
  return Number.isInteger(n) && n >= 1 && n <= 9;
}

export const FIELDER_POSITION_LABELS: Record<FielderPosition, string> = {
  1: "投",
  2: "捕",
  3: "一",
  4: "二",
  5: "三",
  6: "遊",
  7: "左",
  8: "中",
  9: "右",
};
