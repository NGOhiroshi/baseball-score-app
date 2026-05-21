import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GetGameUseCase } from "@/contexts/game-recording/application/get-game.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import { ListMembersUseCase } from "@/contexts/team-management/application/list-members.usecase";
import { ListGuestPlayersUseCase } from "@/contexts/team-management/application/list-guest-players.usecase";
import { MemberSupabaseRepository } from "@/contexts/team-management/infrastructure/member.supabase.repository";
import { GuestPlayerSupabaseRepository } from "@/contexts/team-management/infrastructure/guest-player.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import type { GameId } from "@/contexts/game-recording/domain/game-id";
import {
  asGuestPlayerId,
  asMemberId,
} from "@/contexts/game-recording/domain/player-id";
import { BattingOrderForm } from "./BattingOrderForm";

/**
 * 打順登録画面（UC-GAME-2）。
 *
 * Server Component: メンバー一覧・助っ人一覧・既存打順を取得して
 * Client Component（BattingOrderForm）に渡す。
 */
export default async function BattingOrderPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();

  const game = await new GetGameUseCase(
    new GameSupabaseRepository(supabase),
  ).execute(gameId as GameId);
  if (!game) notFound();

  const [members, guests] = await Promise.all([
    new ListMembersUseCase(new MemberSupabaseRepository(supabase)).execute(
      SMITH_BROTHERS_TEAM_ID,
    ),
    new ListGuestPlayersUseCase(
      new GuestPlayerSupabaseRepository(supabase),
    ).execute(SMITH_BROTHERS_TEAM_ID),
  ]);

  const initialRows = game.battingOrder.map((entry) => {
    const memberId = asMemberId(entry.playerId);
    const guestId = asGuestPlayerId(entry.playerId);
    const playerKey = memberId
      ? `member:${memberId}`
      : guestId
        ? `guest:${guestId}`
        : "";
    return {
      orderNumber: entry.orderNumber,
      playerKey,
      position: entry.position ? String(entry.position) : "",
    };
  });

  return (
    <main className="container py-8">
      <div className="mb-4">
        <Link
          href={`/games/${gameId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 試合詳細
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">打順登録</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {game.gameDate.toLocaleDateString("ja-JP")} vs {game.opponentName}
      </p>

      {members.length === 0 && guests.length === 0 ? (
        <div className="mt-6 rounded-md border bg-card p-4 text-sm">
          先に
          <Link href="/members/new" className="mx-1 text-primary underline">
            メンバー
          </Link>
          を登録するか、下のフォームから助っ人を追加してください。
        </div>
      ) : null}

      <BattingOrderForm
        gameId={gameId}
        members={members.map((m) => ({ id: m.id, name: m.name }))}
        guests={guests.map((g) => ({ id: g.id, name: g.name }))}
        initialRows={initialRows}
      />
    </main>
  );
}
