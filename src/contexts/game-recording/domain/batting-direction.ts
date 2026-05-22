import type { FielderPosition } from "./fielder-position";

/**
 * 打球方向（値オブジェクト）。
 * 草野球向けに 4 分類へ簡略化（左 / 中 / 右 / 内野）。
 *
 * 入力では「打球位置（守備位置 1〜9）」を記録し、打球方向はそこから**導出**する。
 * 成績の打球傾向（引っ張り/流し等）の表示に使う。
 */
export type BattingDirection = "left" | "center" | "right" | "infield";

const ALL: readonly BattingDirection[] = [
  "left",
  "center",
  "right",
  "infield",
] as const;

export function isBattingDirection(value: string): value is BattingDirection {
  return (ALL as readonly string[]).includes(value);
}

export const BATTING_DIRECTION_LABELS: Record<BattingDirection, string> = {
  left: "左",
  center: "中",
  right: "右",
  infield: "内野",
};

/**
 * 打球位置（守備位置）から打球方向を導出する。
 *   7（左翼）→ 左, 8（中堅）→ 中, 9（右翼）→ 右, 1〜6（内野）→ 内野
 */
export function directionFromFielderPosition(
  position: FielderPosition,
): BattingDirection {
  switch (position) {
    case 7:
      return "left";
    case 8:
      return "center";
    case 9:
      return "right";
    default:
      return "infield";
  }
}
