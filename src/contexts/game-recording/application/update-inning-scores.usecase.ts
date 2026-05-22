import { Err, Ok, type Result } from "@/shared/domain/result";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import { InningScore } from "../domain/inning-score";

export type InningScoreInput = {
  inningNumber: number;
  ourScore: number;
  opponentScore: number;
};

export type UpdateInningScoresInput = {
  gameId: GameId;
  scores: InningScoreInput[];
};

/**
 * イニングスコア更新ユースケース（UC-GAME-4）。
 *
 * スコアボードをまるごと差し替える。重複チェックは Game.replaceInningScores
 * （ドメイン）が担う。
 */
export class UpdateInningScoresUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(input: UpdateInningScoresInput): Promise<Result<void, Error>> {
    try {
      const game = await this.gameRepo.findById(input.gameId);
      if (!game) {
        return Err(new Error(`試合が見つかりません: ${input.gameId}`));
      }
      const scores = input.scores.map(
        (s) => new InningScore(s.inningNumber, s.ourScore, s.opponentScore),
      );
      game.replaceInningScores(scores);
      await this.gameRepo.save(game);
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
