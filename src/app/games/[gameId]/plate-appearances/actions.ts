"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RecordPlateAppearanceUseCase } from "@/contexts/game-recording/application/record-plate-appearance.usecase";
import { DeletePlateAppearanceUseCase } from "@/contexts/game-recording/application/delete-plate-appearance.usecase";
import { SetRunScoredUseCase } from "@/contexts/game-recording/application/set-run-scored.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import type { GameId } from "@/contexts/game-recording/domain/game-id";
import type { PlateAppearanceId } from "@/contexts/game-recording/domain/plate-appearance-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { GuestPlayerId } from "@/contexts/team-management/domain/guest-player-id";
import {
  guestPlayerId,
  memberPlayerId,
  type PlayerId,
} from "@/contexts/game-recording/domain/player-id";
import type { BatResultRaw } from "@/contexts/game-recording/domain/bat-result";
import {
  isBattingDirection,
  type BattingDirection,
} from "@/contexts/game-recording/domain/batting-direction";
import {
  isFielderPosition,
  type FielderPosition,
} from "@/contexts/game-recording/domain/fielder-position";

export type RecordPlateAppearanceFormInput = {
  gameId: string;
  playerKey: string; // "member:UUID" / "guest:UUID"
  inning: number;
  category: string;
  hitType?: string;
  walkType?: string;
  outType?: string;
  sacrificeType?: string;
  direction?: string;
  fielderPosition?: string;
  hadError?: boolean;
  runsBattedIn: number;
  runScored: boolean;
};

function parsePlayerKey(key: string): PlayerId {
  const [kind, id] = key.split(":");
  if (kind === "member") return memberPlayerId(id as MemberId);
  if (kind === "guest") return guestPlayerId(id as GuestPlayerId);
  throw new Error(`不正な選手キー: ${key}`);
}

/** 打席結果記録 Server Action（UC-GAME-3） */
export async function recordPlateAppearanceAction(
  input: RecordPlateAppearanceFormInput,
): Promise<void> {
  const direction: BattingDirection | null =
    input.direction && isBattingDirection(input.direction)
      ? input.direction
      : null;
  const fielderPositionNum = Number(input.fielderPosition);
  const fielderPosition: FielderPosition | null =
    input.fielderPosition && isFielderPosition(fielderPositionNum)
      ? fielderPositionNum
      : null;

  const result: BatResultRaw = {
    category: input.category,
    hitType: input.hitType ?? null,
    walkType: input.walkType ?? null,
    outType: input.outType ?? null,
    sacrificeType: input.sacrificeType ?? null,
    direction,
    fielderPosition,
    hadError: input.hadError ?? false,
  };

  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new RecordPlateAppearanceUseCase(repo);

  const res = await usecase.execute({
    gameId: input.gameId as GameId,
    playerId: parsePlayerKey(input.playerKey),
    inning: input.inning,
    result,
    runsBattedIn: input.runsBattedIn,
    runScored: input.runScored,
  });

  if (!res.ok) {
    throw res.error;
  }

  revalidatePath(`/games/${input.gameId}`);
}

/** 打席結果削除 Server Action */
export async function deletePlateAppearanceAction(
  gameId: string,
  plateAppearanceId: string,
): Promise<void> {
  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new DeletePlateAppearanceUseCase(repo);

  const res = await usecase.execute({
    gameId: gameId as GameId,
    plateAppearanceId: plateAppearanceId as PlateAppearanceId,
  });

  if (!res.ok) {
    throw res.error;
  }

  revalidatePath(`/games/${gameId}`);
}

/** 得点フラグ更新 Server Action（出塁後のホームインを後から記録） */
export async function setRunScoredAction(
  gameId: string,
  plateAppearanceId: string,
  runScored: boolean,
): Promise<void> {
  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new SetRunScoredUseCase(repo);

  const res = await usecase.execute({
    gameId: gameId as GameId,
    plateAppearanceId: plateAppearanceId as PlateAppearanceId,
    runScored,
  });

  if (!res.ok) {
    throw res.error;
  }

  revalidatePath(`/games/${gameId}`);
}
