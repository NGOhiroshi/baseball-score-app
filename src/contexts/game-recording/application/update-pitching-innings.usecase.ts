import { Err, Ok, type Result } from "@/shared/domain/result";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import { InningPitched } from "../domain/inning-pitched";
import type { PitchingAppearanceId } from "../domain/pitching-appearance-id";

export type InningPitchedInput = {
  inningNumber: number;
  outsRecorded: number;
  runsAllowed: number;
  earnedRuns: number;
  hitsAllowed: number;
  strikeouts: number;
  walksAllowed: number;
};

export type UpdatePitchingInningsInput = {
  gameId: GameId;
  pitchingAppearanceId: PitchingAppearanceId;
  innings: InningPitchedInput[];
};

/**
 * 投手のイニング記録をまとめて更新するユースケース。
 *
 * 草野球の「イニング終了時にまとめて入力」UX に対応。
 * 生入力から InningPitched を構築する時点で 1イニング分の不変条件
 * （自責点 ≤ 失点、アウト 0〜3 など）が検証される。
 */
export class UpdatePitchingInningsUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(
    input: UpdatePitchingInningsInput,
  ): Promise<Result<void, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }

      const records = input.innings.map(
        (r) =>
          new InningPitched(
            r.inningNumber,
            r.outsRecorded as 0 | 1 | 2 | 3,
            r.runsAllowed,
            r.earnedRuns,
            r.hitsAllowed,
            r.strikeouts,
            r.walksAllowed,
          ),
      );

      game.replacePitchingInnings(input.pitchingAppearanceId, records);
      await this.gameRepo.save(game);
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
