import { describe, it, expect } from "vitest";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import { BattingOrderEntry } from "./batting-order-entry";
import { Game } from "./game";
import { InningPitched } from "./inning-pitched";
import { InningsPitched } from "./innings-pitched";
import { PitchingAppearance } from "./pitching-appearance";
import { memberPlayerId, type PlayerId } from "./player-id";

const teamId = "team-1" as TeamId;
const alice = memberPlayerId("alice" as MemberId);
const bob = memberPlayerId("bob" as MemberId);

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

describe("InningPitched（不変条件）", () => {
  it("自責点が失点を超えると拒否する", () => {
    expect(() => new InningPitched(1, 3, 1, 2, 0, 0, 0)).toThrow();
  });

  it("アウト数が3を超えると拒否する", () => {
    expect(() => new InningPitched(1, 4 as 0 | 1 | 2 | 3, 0, 0, 0, 0, 0)).toThrow();
  });

  it("負のカウントを拒否する", () => {
    expect(() => new InningPitched(1, 3, -1, 0, 0, 0, 0)).toThrow();
  });

  it("自責点=失点は許容する", () => {
    expect(() => new InningPitched(1, 3, 2, 2, 1, 0, 0)).not.toThrow();
  });
});

describe("InningsPitched（投球回の導出）", () => {
  it("3アウトで1回", () => {
    expect(InningsPitched.fromOuts(3).toString()).toBe("1");
  });

  it("7アウトで2回1/3 → '2.1'", () => {
    const ip = InningsPitched.fromOuts(7);
    expect(ip.completeInnings).toBe(2);
    expect(ip.partialOuts).toBe(1);
    expect(ip.toString()).toBe("2.1");
  });

  it("0アウトは '0'", () => {
    expect(InningsPitched.fromOuts(0).toString()).toBe("0");
  });
});

describe("PitchingAppearance（導出値）", () => {
  it("イニング記録から合計と投球回を導出する", () => {
    const pa = PitchingAppearance.record({
      pitcherId: alice,
      enteredAtInning: 1,
      inningRecords: [
        new InningPitched(1, 3, 1, 1, 2, 1, 0),
        new InningPitched(2, 1, 2, 1, 1, 0, 1),
      ],
    });
    expect(pa.inningsPitched().toString()).toBe("1.1"); // 4アウト
    expect(pa.totalRunsAllowed()).toBe(3);
    expect(pa.totalEarnedRuns()).toBe(2);
    expect(pa.totalHitsAllowed()).toBe(3);
    expect(pa.totalStrikeouts()).toBe(1);
    expect(pa.totalWalksAllowed()).toBe(1);
  });

  it("同一イニングの記録重複を拒否する", () => {
    expect(() =>
      PitchingAppearance.record({
        pitcherId: alice,
        enteredAtInning: 1,
        inningRecords: [
          new InningPitched(1, 3, 0, 0, 0, 0, 0),
          new InningPitched(1, 3, 0, 0, 0, 0, 0),
        ],
      }),
    ).toThrow();
  });

  it("withInningRecords は ID を保ったまま記録を差し替える", () => {
    const pa = PitchingAppearance.record({ pitcherId: alice, enteredAtInning: 1 });
    const updated = pa.withInningRecords([new InningPitched(1, 3, 0, 0, 0, 2, 0)]);
    expect(updated.id).toBe(pa.id);
    expect(updated.totalStrikeouts()).toBe(2);
    expect(pa.totalStrikeouts()).toBe(0); // 元は不変
  });
});

describe("Game.addPitchingAppearance（集約の不変条件）", () => {
  it("打順にいない選手の登板は拒否する", () => {
    const game = gameWithOrder([alice]);
    const pa = PitchingAppearance.record({ pitcherId: bob, enteredAtInning: 1 });
    expect(() => game.addPitchingAppearance(pa)).toThrow();
  });

  it("打順にいる選手の登板は受理する", () => {
    const game = gameWithOrder([alice]);
    const pa = PitchingAppearance.record({ pitcherId: alice, enteredAtInning: 1 });
    game.addPitchingAppearance(pa);
    expect(game.pitchingAppearances).toHaveLength(1);
  });

  it("replacePitchingInnings は対象登板の記録だけ差し替える", () => {
    const game = gameWithOrder([alice, bob]);
    const pa1 = PitchingAppearance.record({ pitcherId: alice, enteredAtInning: 1 });
    const pa2 = PitchingAppearance.record({ pitcherId: bob, enteredAtInning: 4 });
    game.addPitchingAppearance(pa1);
    game.addPitchingAppearance(pa2);

    game.replacePitchingInnings(pa1.id, [new InningPitched(1, 3, 0, 0, 0, 3, 0)]);

    const after1 = game.pitchingAppearances.find((p) => p.id === pa1.id);
    const after2 = game.pitchingAppearances.find((p) => p.id === pa2.id);
    expect(after1?.totalStrikeouts()).toBe(3);
    expect(after2?.inningRecords).toHaveLength(0);
  });

  it("removePitchingAppearance は対象だけ削除する", () => {
    const game = gameWithOrder([alice, bob]);
    const pa1 = PitchingAppearance.record({ pitcherId: alice, enteredAtInning: 1 });
    const pa2 = PitchingAppearance.record({ pitcherId: bob, enteredAtInning: 4 });
    game.addPitchingAppearance(pa1);
    game.addPitchingAppearance(pa2);
    game.removePitchingAppearance(pa1.id);
    expect(game.pitchingAppearances).toHaveLength(1);
    expect(game.pitchingAppearances[0]?.id).toBe(pa2.id);
  });
});
