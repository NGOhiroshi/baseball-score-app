"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CreateGameUseCase } from "@/contexts/game-recording/application/create-game.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";

/** 試合作成 Server Action（UC-GAME-1） */
export async function createGameAction(formData: FormData): Promise<void> {
  const gameDateStr = String(formData.get("gameDate") ?? "");
  const opponentName = String(formData.get("opponentName") ?? "");

  const gameDate = new Date(gameDateStr);
  if (Number.isNaN(gameDate.getTime())) {
    throw new Error(`不正な試合日です: ${gameDateStr}`);
  }

  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new CreateGameUseCase(repo);

  const result = await usecase.execute({
    teamId: SMITH_BROTHERS_TEAM_ID,
    gameDate,
    opponentName,
  });

  if (!result.ok) {
    throw result.error;
  }

  revalidatePath("/games");
  redirect(`/games/${result.value}`);
}
