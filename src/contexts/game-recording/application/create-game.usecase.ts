import type { TeamId } from "@/contexts/team-management/domain/team-id";
import { Err, Ok, type Result } from "@/shared/domain/result";
import { Game } from "../domain/game";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";

export type CreateGameInput = {
  teamId: TeamId;
  gameDate: Date;
  opponentName: string;
};

/**
 * 試合作成ユースケース（UC-GAME-1）。
 *
 * 試合日と対戦相手だけで Game 集約を生成して保存する。
 * 打順・打席結果・投手記録は別ユースケースで後から積む。
 */
export class CreateGameUseCase {
  constructor(private readonly gameRepo: GameRepository) {}

  async execute(input: CreateGameInput): Promise<Result<GameId, Error>> {
    try {
      const game = Game.create({
        teamId: input.teamId,
        gameDate: input.gameDate,
        opponentName: input.opponentName,
      });
      await this.gameRepo.save(game);
      return Ok(game.id);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
