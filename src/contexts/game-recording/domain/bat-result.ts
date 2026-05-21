import {
  BATTING_DIRECTION_LABELS,
  type BattingDirection,
} from "./batting-direction";
import {
  FIELDER_POSITION_LABELS,
  type FielderPosition,
} from "./fielder-position";

/**
 * 打席結果（値オブジェクト）。★ 草野球ドメインの中核
 *
 * 上位カテゴリを `category` で判別する **判別共用体（discriminated union）**。
 * これにより「安打/出塁/凡退/犠打犠飛/失策のみ」の排他性を**型レベルで保証**する。
 * （安打の時だけ hadError が存在する、など各カテゴリ固有のフィールドも型で表現）
 */
export type HitType = "single" | "double" | "triple" | "homerun";
export type WalkType = "baseOnBalls" | "hitByPitch";
export type OutType = "strikeout" | "groundOut" | "flyOut";
export type SacrificeType = "bunt" | "fly";

export type BatResult =
  | {
      category: "hit";
      hitType: HitType;
      direction: BattingDirection | null;
      hadError: boolean; // 「安打 + 失策」の同時記録を表すフラグ
    }
  | { category: "walk"; walkType: WalkType }
  | {
      category: "out";
      outType: OutType;
      fielderPosition: FielderPosition | null;
    }
  | {
      category: "sacrifice";
      sacrificeType: SacrificeType;
      fielderPosition: FielderPosition | null;
    }
  | { category: "errorOnly"; fielderPosition: FielderPosition | null };

export type BatResultCategory = BatResult["category"];

// =========================================================================
// 振る舞い（情報エキスパート原則）
//   「打数か？」「安打か？」を BatResult 自身に答えさせることで、
//   集計ロジックの所在を1か所に集約する。成績集計コンテキストや UI 側に
//   ルールが分散しない。
// =========================================================================

/** 打数にカウントするか（四死球・犠打・犠飛は除外） */
export function countsAsAtBat(r: BatResult): boolean {
  return r.category !== "walk" && r.category !== "sacrifice";
}

/** 安打にカウントするか（hadError=true でも安打として数える＝草野球ルール） */
export function countsAsHit(r: BatResult): boolean {
  return r.category === "hit";
}

/** 本塁打か */
export function isHomeRun(r: BatResult): boolean {
  return r.category === "hit" && r.hitType === "homerun";
}

// =========================================================================
// ファクトリ（境界での検証）
//   フォーム等の生入力から BatResult を構築。不正な組み合わせは例外。
// =========================================================================

const HIT_TYPES: readonly HitType[] = [
  "single",
  "double",
  "triple",
  "homerun",
];
const WALK_TYPES: readonly WalkType[] = ["baseOnBalls", "hitByPitch"];
const OUT_TYPES: readonly OutType[] = ["strikeout", "groundOut", "flyOut"];
const SACRIFICE_TYPES: readonly SacrificeType[] = ["bunt", "fly"];

export type BatResultRaw = {
  category: string;
  hitType?: string | null;
  walkType?: string | null;
  outType?: string | null;
  sacrificeType?: string | null;
  direction?: BattingDirection | null;
  fielderPosition?: FielderPosition | null;
  hadError?: boolean;
};

export function buildBatResult(raw: BatResultRaw): BatResult {
  switch (raw.category) {
    case "hit": {
      if (!raw.hitType || !HIT_TYPES.includes(raw.hitType as HitType)) {
        throw new Error(`不正な安打種別: ${raw.hitType}`);
      }
      return {
        category: "hit",
        hitType: raw.hitType as HitType,
        direction: raw.direction ?? null,
        hadError: raw.hadError ?? false,
      };
    }
    case "walk": {
      if (!raw.walkType || !WALK_TYPES.includes(raw.walkType as WalkType)) {
        throw new Error(`不正な出塁種別: ${raw.walkType}`);
      }
      return { category: "walk", walkType: raw.walkType as WalkType };
    }
    case "out": {
      if (!raw.outType || !OUT_TYPES.includes(raw.outType as OutType)) {
        throw new Error(`不正な凡退種別: ${raw.outType}`);
      }
      return {
        category: "out",
        outType: raw.outType as OutType,
        fielderPosition: raw.fielderPosition ?? null,
      };
    }
    case "sacrifice": {
      if (
        !raw.sacrificeType ||
        !SACRIFICE_TYPES.includes(raw.sacrificeType as SacrificeType)
      ) {
        throw new Error(`不正な犠打/犠飛種別: ${raw.sacrificeType}`);
      }
      return {
        category: "sacrifice",
        sacrificeType: raw.sacrificeType as SacrificeType,
        fielderPosition: raw.fielderPosition ?? null,
      };
    }
    case "errorOnly": {
      return {
        category: "errorOnly",
        fielderPosition: raw.fielderPosition ?? null,
      };
    }
    default:
      throw new Error(`不正な打席結果カテゴリ: ${raw.category}`);
  }
}

// =========================================================================
// 表示用ラベル
// =========================================================================

const HIT_LABELS: Record<HitType, string> = {
  single: "単打",
  double: "二塁打",
  triple: "三塁打",
  homerun: "本塁打",
};
const WALK_LABELS: Record<WalkType, string> = {
  baseOnBalls: "四球",
  hitByPitch: "死球",
};
const OUT_LABELS: Record<OutType, string> = {
  strikeout: "三振",
  groundOut: "ゴロ",
  flyOut: "フライ",
};
const SACRIFICE_LABELS: Record<SacrificeType, string> = {
  bunt: "犠打",
  fly: "犠飛",
};

/** 打席結果を短い日本語ラベルに変換（一覧表示用） */
export function batResultLabel(r: BatResult): string {
  switch (r.category) {
    case "hit": {
      const dir = r.direction ? BATTING_DIRECTION_LABELS[r.direction] : "";
      const err = r.hadError ? "(失策)" : "";
      return `${dir}${HIT_LABELS[r.hitType]}${err}`;
    }
    case "walk":
      return WALK_LABELS[r.walkType];
    case "out": {
      const pos = r.fielderPosition
        ? FIELDER_POSITION_LABELS[r.fielderPosition]
        : "";
      return `${pos}${OUT_LABELS[r.outType]}`;
    }
    case "sacrifice": {
      const pos = r.fielderPosition
        ? FIELDER_POSITION_LABELS[r.fielderPosition]
        : "";
      return `${pos}${SACRIFICE_LABELS[r.sacrificeType]}`;
    }
    case "errorOnly": {
      const pos = r.fielderPosition
        ? FIELDER_POSITION_LABELS[r.fielderPosition]
        : "";
      return `${pos}失策`;
    }
  }
}
