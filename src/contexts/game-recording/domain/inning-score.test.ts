import { describe, it, expect } from "vitest";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import { Game } from "./game";
import { InningScore } from "./inning-score";

const teamId = "team-1" as TeamId;

function emptyGame(): Game {
  return Game.create({
    teamId,
    gameDate: new Date("2026-05-01"),
    opponentName: "Lions",
  });
}

describe("InningScore 不変条件", () => {
  it("イニング番号 < 1 は拒否する", () => {
    expect(() => new InningScore(0, 0, 0)).toThrow();
  });
  it("得点が負は拒否する", () => {
    expect(() => new InningScore(1, -1, 0)).toThrow();
  });
});

describe("Game.replaceInningScores", () => {
  it("空のスコアは許容する（未入力の試合）", () => {
    const game = emptyGame();
    expect(() => game.replaceInningScores([])).not.toThrow();
    expect(game.inningScores).toHaveLength(0);
  });

  it("イニング番号の重複を拒否する", () => {
    const game = emptyGame();
    expect(() =>
      game.replaceInningScores([
        new InningScore(1, 1, 0),
        new InningScore(1, 0, 1),
      ]),
    ).toThrow();
  });

  it("イニング番号の昇順で保持する", () => {
    const game = emptyGame();
    game.replaceInningScores([
      new InningScore(3, 1, 0),
      new InningScore(1, 0, 1),
      new InningScore(2, 2, 0),
    ]);
    expect(game.inningScores.map((s) => s.inningNumber)).toEqual([1, 2, 3]);
  });
});

describe("Game.finalScore（導出）", () => {
  it("スコア未入力なら 0-0", () => {
    const game = emptyGame();
    const final = game.finalScore();
    expect(final.ourScore).toBe(0);
    expect(final.opponentScore).toBe(0);
    expect(final.isDraw()).toBe(true);
  });

  it("イニングスコアの合計を返す", () => {
    const game = emptyGame();
    game.replaceInningScores([
      new InningScore(1, 0, 1),
      new InningScore(2, 2, 0),
      new InningScore(3, 1, 0),
    ]);
    const final = game.finalScore();
    expect(final.ourScore).toBe(3);
    expect(final.opponentScore).toBe(1);
    expect(final.isWin()).toBe(true);
    expect(final.resultMark()).toBe("○");
  });

  it("再差し替え後も常に最新の合計を返す（二重保持しない）", () => {
    const game = emptyGame();
    game.replaceInningScores([new InningScore(1, 5, 0)]);
    expect(game.finalScore().ourScore).toBe(5);
    game.replaceInningScores([new InningScore(1, 1, 0)]);
    expect(game.finalScore().ourScore).toBe(1);
  });
});
