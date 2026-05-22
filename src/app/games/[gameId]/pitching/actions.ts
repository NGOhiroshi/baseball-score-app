"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RecordPitchingAppearanceUseCase } from "@/contexts/game-recording/application/record-pitching-appearance.usecase";
import {
  UpdatePitchingInningsUseCase,
  type InningPitchedInput,
} from "@/contexts/game-recording/application/update-pitching-innings.usecase";
import { DeletePitchingAppearanceUseCase } from "@/contexts/game-recording/application/delete-pitching-appearance.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import type { GameId } from "@/contexts/game-recording/domain/game-id";
import type { PitchingAppearanceId } from "@/contexts/game-recording/domain/pitching-appearance-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { GuestPlayerId } from "@/contexts/team-management/domain/guest-player-id";
import {
  guestPlayerId,
  memberPlayerId,
  type PlayerId,
} from "@/contexts/game-recording/domain/player-id";

function parsePlayerKey(key: string): PlayerId {
  const [kind, id] = key.split(":");
  if (kind === "member") return memberPlayerId(id as MemberId);
  if (kind === "guest") return guestPlayerId(id as GuestPlayerId);
  throw new Error(`不正な選手キー: ${key}`);
}

/** 投手登板の記録 Server Action */
export async function recordPitchingAppearanceAction(input: {
  gameId: string;
  pitcherKey: string;
  enteredAtInning: number;
}): Promise<void> {
  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new RecordPitchingAppearanceUseCase(repo);

  const res = await usecase.execute({
    gameId: input.gameId as GameId,
    pitcherId: parsePlayerKey(input.pitcherKey),
    enteredAtInning: input.enteredAtInning,
  });

  if (!res.ok) {
    throw res.error;
  }

  revalidatePath(`/games/${input.gameId}`);
}

/** 投手のイニング記録更新 Server Action */
export async function updatePitchingInningsAction(
  gameId: string,
  pitchingAppearanceId: string,
  innings: InningPitchedInput[],
): Promise<void> {
  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new UpdatePitchingInningsUseCase(repo);

  const res = await usecase.execute({
    gameId: gameId as GameId,
    pitchingAppearanceId: pitchingAppearanceId as PitchingAppearanceId,
    innings,
  });

  if (!res.ok) {
    throw res.error;
  }

  revalidatePath(`/games/${gameId}`);
}

/** 投手登板の削除 Server Action */
export async function deletePitchingAppearanceAction(
  gameId: string,
  pitchingAppearanceId: string,
): Promise<void> {
  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new DeletePitchingAppearanceUseCase(repo);

  const res = await usecase.execute({
    gameId: gameId as GameId,
    pitchingAppearanceId: pitchingAppearanceId as PitchingAppearanceId,
  });

  if (!res.ok) {
    throw res.error;
  }

  revalidatePath(`/games/${gameId}`);
}
