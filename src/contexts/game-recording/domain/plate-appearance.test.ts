import { describe, it, expect } from "vitest";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { BatResult } from "./bat-result";
import { PlateAppearance } from "./plate-appearance";
import { memberPlayerId } from "./player-id";

const alice = memberPlayerId("alice" as MemberId);
const single: BatResult = {
  category: "hit",
  hitType: "single",
  fielderPosition: null,
  hadError: false,
};

describe("PlateAppearance.withRunScored", () => {
  it("同じIDで新しいインスタンスを返し、他フィールドを保持する", () => {
    const pa = PlateAppearance.record({
      playerId: alice,
      inning: 3,
      result: single,
      runsBattedIn: 2,
      runScored: false,
    });
    const updated = pa.withRunScored(true);

    expect(updated.id).toBe(pa.id);
    expect(updated.runScored).toBe(true);
    expect(updated.inning).toBe(3);
    expect(updated.runsBattedIn).toBe(2);
  });

  it("元のインスタンスは変更されない（イミュータブル）", () => {
    const pa = PlateAppearance.record({
      playerId: alice,
      inning: 1,
      result: single,
      runScored: false,
    });
    pa.withRunScored(true);
    expect(pa.runScored).toBe(false);
  });
});

describe("PlateAppearance 不変条件", () => {
  it("inning < 1 は拒否する", () => {
    expect(() =>
      PlateAppearance.record({ playerId: alice, inning: 0, result: single }),
    ).toThrow();
  });

  it("打点が負の値は拒否する", () => {
    expect(() =>
      PlateAppearance.record({
        playerId: alice,
        inning: 1,
        result: single,
        runsBattedIn: -1,
      }),
    ).toThrow();
  });
});
