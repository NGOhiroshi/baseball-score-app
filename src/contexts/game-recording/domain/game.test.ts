import { describe, it, expect } from "vitest";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import { BattingOrderEntry } from "./batting-order-entry";
import type { BatResult } from "./bat-result";
import { Game } from "./game";
import { PlateAppearance } from "./plate-appearance";
import type { PlateAppearanceId } from "./plate-appearance-id";
import { memberPlayerId, type PlayerId } from "./player-id";

const teamId = "team-1" as TeamId;
const alice = memberPlayerId("alice" as MemberId);
const bob = memberPlayerId("bob" as MemberId);
const single: BatResult = {
  category: "hit",
  hitType: "single",
  fielderPosition: null,
  hadError: false,
};

function gameWithOrder(players: PlayerId[] = [alice, bob]): Game {
  const game = Game.create({
    teamId,
    gameDate: new Date("2026-05-01"),
    opponentName: "Lions",
  });
  game.replaceBattingOrder(
    players.map((p, i) =>
      BattingOrderEntry.create({ orderNumber: i + 1, playerId: p }),
    ),
  );
  return game;
}

describe("Game.replaceBattingOrder", () => {
  it("空の打順は拒否する", () => {
    const game = gameWithOrder();
    expect(() => game.replaceBattingOrder([])).toThrow();
  });

  it("打順番号の重複を拒否する", () => {
    const game = gameWithOrder();
    expect(() =>
      game.replaceBattingOrder([
        BattingOrderEntry.create({ orderNumber: 1, playerId: alice }),
        BattingOrderEntry.create({ orderNumber: 1, playerId: bob }),
      ]),
    ).toThrow();
  });

  it("orderNumber 昇順で保持する", () => {
    const game = gameWithOrder();
    game.replaceBattingOrder([
      BattingOrderEntry.create({ orderNumber: 2, playerId: bob }),
      BattingOrderEntry.create({ orderNumber: 1, playerId: alice }),
    ]);
    expect(game.battingOrder.map((e) => e.orderNumber)).toEqual([1, 2]);
  });
});

describe("Game.addPlateAppearance", () => {
  it("打順にいない選手の打席は拒否する", () => {
    const game = gameWithOrder([alice]);
    const pa = PlateAppearance.record({
      playerId: bob,
      inning: 1,
      result: single,
    });
    expect(() => game.addPlateAppearance(pa)).toThrow();
  });

  it("打順にいる選手の打席は受理する", () => {
    const game = gameWithOrder([alice]);
    const pa = PlateAppearance.record({
      playerId: alice,
      inning: 1,
      result: single,
    });
    game.addPlateAppearance(pa);
    expect(game.plateAppearances).toHaveLength(1);
  });
});

describe("Game.setRunScored（得点トグル）", () => {
  it("対象の打席だけ runScored が変わる", () => {
    const game = gameWithOrder([alice, bob]);
    const pa1 = PlateAppearance.record({
      playerId: alice,
      inning: 1,
      result: single,
    });
    const pa2 = PlateAppearance.record({
      playerId: bob,
      inning: 1,
      result: single,
    });
    game.addPlateAppearance(pa1);
    game.addPlateAppearance(pa2);

    game.setRunScored(pa1.id, true);

    const after1 = game.plateAppearances.find((p) => p.id === pa1.id);
    const after2 = game.plateAppearances.find((p) => p.id === pa2.id);
    expect(after1?.runScored).toBe(true);
    expect(after2?.runScored).toBe(false);
  });

  it("トグルで戻せる（true→false）", () => {
    const game = gameWithOrder([alice]);
    const pa = PlateAppearance.record({
      playerId: alice,
      inning: 1,
      result: single,
      runScored: true,
    });
    game.addPlateAppearance(pa);
    game.setRunScored(pa.id, false);
    expect(game.plateAppearances[0]?.runScored).toBe(false);
  });

  it("存在しないIDを指定しても既存の打席に影響しない", () => {
    const game = gameWithOrder([alice]);
    const pa = PlateAppearance.record({
      playerId: alice,
      inning: 1,
      result: single,
    });
    game.addPlateAppearance(pa);
    game.setRunScored("nonexistent" as PlateAppearanceId, true);
    expect(game.plateAppearances[0]?.runScored).toBe(false);
  });

  it("連続トグルが冪等に積み重なる（true→false→true）", () => {
    const game = gameWithOrder([alice]);
    const pa = PlateAppearance.record({
      playerId: alice,
      inning: 1,
      result: single,
    });
    game.addPlateAppearance(pa);
    game.setRunScored(pa.id, true);
    game.setRunScored(pa.id, false);
    game.setRunScored(pa.id, true);
    expect(game.plateAppearances[0]?.runScored).toBe(true);
    expect(game.plateAppearances).toHaveLength(1); // 重複が増えない
  });
});

describe("Game.removePlateAppearance", () => {
  it("対象の打席だけ削除する", () => {
    const game = gameWithOrder([alice, bob]);
    const pa1 = PlateAppearance.record({
      playerId: alice,
      inning: 1,
      result: single,
    });
    const pa2 = PlateAppearance.record({
      playerId: bob,
      inning: 1,
      result: single,
    });
    game.addPlateAppearance(pa1);
    game.addPlateAppearance(pa2);
    game.removePlateAppearance(pa1.id);
    expect(game.plateAppearances).toHaveLength(1);
    expect(game.plateAppearances[0]?.id).toBe(pa2.id);
  });
});
