"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RegisterBattingOrderUseCase } from "@/contexts/game-recording/application/register-batting-order.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import type { GameId } from "@/contexts/game-recording/domain/game-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import { memberPlayerId } from "@/contexts/game-recording/domain/player-id";
import { isFielderPosition } from "@/contexts/game-recording/domain/fielder-position";

type BattingOrderFormEntry = {
  orderNumber: number;
  memberId: string; // UUID。空文字なら不参加
  position: string; // "1"〜"9" または "" 任意
};

/**
 * 打順保存 Server Action（UC-GAME-2）。
 *
 * フォームから JSON 文字列で entries を受け取り、
 * memberId が空のエントリを除外、Position をパースしてから
 * ユースケースに渡す。
 *
 * 注: 「打順番号の重複」「1人以上」のチェックはユースケース内（ドメイン）で実施。
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
    .filter((e) => e.memberId && e.memberId.trim() !== "")
    .map((e) => {
      const positionNum = Number(e.position);
      const position =
        e.position && isFielderPosition(positionNum) ? positionNum : null;
      return {
        orderNumber: Number(e.orderNumber),
        playerId: memberPlayerId(e.memberId as MemberId),
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
