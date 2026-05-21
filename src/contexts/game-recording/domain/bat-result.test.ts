import { describe, it, expect } from "vitest";
import {
  buildBatResult,
  countsAsAtBat,
  countsAsHit,
  isHomeRun,
  type BatResult,
} from "./bat-result";

const hitSingle: BatResult = {
  category: "hit",
  hitType: "single",
  direction: null,
  hadError: false,
};
const hitWithError: BatResult = {
  category: "hit",
  hitType: "single",
  direction: null,
  hadError: true,
};
const homerun: BatResult = {
  category: "hit",
  hitType: "homerun",
  direction: "center",
  hadError: false,
};
const walk: BatResult = { category: "walk", walkType: "baseOnBalls" };
const strikeout: BatResult = {
  category: "out",
  outType: "strikeout",
  fielderPosition: null,
};
const sacBunt: BatResult = {
  category: "sacrifice",
  sacrificeType: "bunt",
  fielderPosition: null,
};
const errorOnly: BatResult = { category: "errorOnly", fielderPosition: null };

describe("countsAsAtBat（打数判定）", () => {
  it("四球は打数に含めない", () => {
    expect(countsAsAtBat(walk)).toBe(false);
  });
  it("犠打・犠飛は打数に含めない", () => {
    expect(countsAsAtBat(sacBunt)).toBe(false);
  });
  it("安打・凡退・失策のみは打数に含める", () => {
    expect(countsAsAtBat(hitSingle)).toBe(true);
    expect(countsAsAtBat(strikeout)).toBe(true);
    expect(countsAsAtBat(errorOnly)).toBe(true);
  });
});

describe("countsAsHit（安打判定）", () => {
  it("安打は失策フラグ付きでも安打として数える（草野球ルール）", () => {
    expect(countsAsHit(hitSingle)).toBe(true);
    expect(countsAsHit(hitWithError)).toBe(true);
  });
  it("失策のみは安打ではない", () => {
    expect(countsAsHit(errorOnly)).toBe(false);
  });
  it("四球は安打ではない", () => {
    expect(countsAsHit(walk)).toBe(false);
  });
});

describe("isHomeRun", () => {
  it("本塁打を判定する", () => {
    expect(isHomeRun(homerun)).toBe(true);
    expect(isHomeRun(hitSingle)).toBe(false);
  });
});

describe("buildBatResult（生入力からの構築・検証）", () => {
  it("正常な安打を構築する", () => {
    const r = buildBatResult({
      category: "hit",
      hitType: "double",
      direction: "left",
      hadError: false,
    });
    expect(r.category).toBe("hit");
  });

  it("不正な安打種別は例外", () => {
    expect(() => buildBatResult({ category: "hit", hitType: "xxx" })).toThrow();
  });

  it("不正なカテゴリは例外", () => {
    expect(() => buildBatResult({ category: "unknown" })).toThrow();
  });

  it("出塁種別が無ければ例外", () => {
    expect(() => buildBatResult({ category: "walk" })).toThrow();
  });
});
