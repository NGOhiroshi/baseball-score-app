"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RegisterBattingOrderUseCase } from "@/contexts/game-recording/application/register-batting-order.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import { RegisterGuestPlayerUseCase } from "@/contexts/team-management/application/register-guest-player.usecase";
import { GuestPlayerSupabaseRepository } from "@/contexts/team-management/infrastructure/guest-player.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import type { GameId } from "@/contexts/game-recording/domain/game-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { GuestPlayerId } from "@/contexts/team-management/domain/guest-player-id";
import {
  guestPlayerId,
  memberPlayerId,
  type PlayerId,
} from "@/contexts/game-recording/domain/player-id";
import { isFielderPosition } from "@/contexts/game-recording/domain/fielder-position";

type BattingOrderFormEntry = {
  orderNumber: number;
  playerKey: string; // "member:UUID" または "guest:UUID"
  position: string; // "1"〜"9" または ""
};

/**
 * 打順保存 Server Action（UC-GAME-2）。
 *
 * フォームからは `playerKey` 形式（"member:UUID" / "guest:UUID"）で
 * 選手識別子を受け取り、kind プレフィックスを見て PlayerId 判別共用体を構築する。
 */
export async function saveBattingOrderAction(
  gameId: string,
  formData: FormData,
): Promise<void> {
  const entriesJson = String(formData.get("entries") ?? "[]");
  let raw: BattingOrderFormEntry[];
  try {
    raw = JSON.parse(entriesJson);
  } catch {
    throw new Error("打順データのパースに失敗しました");
  }

  const entries = raw
    .filter((e) => e.playerKey && e.playerKey.includes(":"))
    .map((e) => {
      const [kind, id] = e.playerKey.split(":");
      let playerId: PlayerId;
      if (kind === "member") {
        playerId = memberPlayerId(id as MemberId);
      } else if (kind === "guest") {
        playerId = guestPlayerId(id as GuestPlayerId);
      } else {
        throw new Error(`不正な選手キー: ${e.playerKey}`);
      }
      const positionNum = Number(e.position);
      const position =
        e.position && isFielderPosition(positionNum) ? positionNum : null;
      return {
        orderNumber: Number(e.orderNumber),
        playerId,
        position,
      };
    });

  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new RegisterBattingOrderUseCase(repo);

  const result = await usecase.execute({
    gameId: gameId as GameId,
    entries,
  });

  if (!result.ok) {
    throw result.error;
  }

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

/**
 * 助っ人選手の臨時登録 Server Action（UC-TEAM-4）。
 *
 * 打順登録画面の中から呼ばれ、登録後に同画面を revalidate して
 * Client Component が新しい助っ人を含むリストを受け取れるようにする。
 */
export async function registerGuestPlayerAction(
  gameId: string,
  name: string,
): Promise<void> {
  const supabase = await createClient();
  const repo = new GuestPlayerSupabaseRepository(supabase);
  const usecase = new RegisterGuestPlayerUseCase(repo);

  const result = await usecase.execute({
    teamId: SMITH_BROTHERS_TEAM_ID,
    name,
  });

  if (!result.ok) {
    throw result.error;
  }

  revalidatePath(`/games/${gameId}/batting-order`);
}
