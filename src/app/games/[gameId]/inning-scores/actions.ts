"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UpdateInningScoresUseCase } from "@/contexts/game-recording/application/update-inning-scores.usecase";
import { SetBatsFirstUseCase } from "@/contexts/game-recording/application/set-bats-first.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import type { GameId } from "@/contexts/game-recording/domain/game-id";

export type InningScoreFormInput = {
  inningNumber: number;
  ourScore: number;
  opponentScore: number;
};

/** イニングスコア更新 Server Action（UC-GAME-4） */
export async function updateInningScoresAction(
  gameId: string,
  scores: InningScoreFormInput[],
): Promise<void> {
  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new UpdateInningScoresUseCase(repo);

  const res = await usecase.execute({
    gameId: gameId as GameId,
    scores,
  });

  if (!res.ok) {
    throw res.error;
  }

  revalidatePath(`/games/${gameId}`);
}

/** 先攻/後攻 切り替え Server Action */
export async function setBatsFirstAction(
  gameId: string,
  batsFirst: boolean,
): Promise<void> {
  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new SetBatsFirstUseCase(repo);

  const res = await usecase.execute({
    gameId: gameId as GameId,
    batsFirst,
  });

  if (!res.ok) {
    throw res.error;
  }

  revalidatePath(`/games/${gameId}`);
}
