/**
 * 打球方向（値オブジェクト）。
 * 草野球向けに 4 分類へ簡略化（左 / 中 / 右 / 内野）。
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
