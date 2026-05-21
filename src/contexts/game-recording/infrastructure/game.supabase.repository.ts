import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import { BattingOrderEntry } from "../domain/batting-order-entry";
import type { BattingOrderEntryId } from "../domain/batting-order-entry-id";
import {
  isFielderPosition,
  type FielderPosition,
} from "../domain/fielder-position";
import { Game } from "../domain/game";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import {
  asGuestPlayerId,
  asMemberId,
  guestPlayerId,
  memberPlayerId,
  type GuestPlayerIdBrand,
  type PlayerId,
} from "../domain/player-id";

type GameRow = {
  id: string;
  team_id: string;
  game_date: string;
  opponent_name: string;
};

type BattingOrderRow = {
  id: string;
  game_id: string;
  order_number: number;
  member_id: string | null;
  guest_player_id: string | null;
  position: number | null;
};

/**
 * Game 集約の Supabase 実装。
 *
 * Game 集約は **games + batting_order_entries の2テーブル**にまたがって永続化される。
 * save() は両テーブルへの書き込みを順に行う。
 *
 * ⚠️ MVPでは「DELETE 子 → INSERT 子」方式で打順を一括差し替える。
 *    厳密なトランザクションが必要なら Postgres 関数（RPC）化を Phase 2 で検討。
 */
export class GameSupabaseRepository implements GameRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(game: Game): Promise<void> {
    // 1) games テーブルに upsert
    const { error: gameErr } = await this.supabase.from("games").upsert({
      id: game.id,
      team_id: game.teamId,
      game_date: toDateOnly(game.gameDate),
      opponent_name: game.opponentName,
    });
    if (gameErr) {
      throw new Error(`試合の保存に失敗しました: ${gameErr.message}`);
    }

    // 2) batting_order_entries を一旦全削除
    const { error: delErr } = await this.supabase
      .from("batting_order_entries")
      .delete()
      .eq("game_id", game.id);
    if (delErr) {
      throw new Error(`打順の削除に失敗しました: ${delErr.message}`);
    }

    // 3) 新しい打順を挿入（あれば）
    if (game.battingOrder.length > 0) {
      const rows = game.battingOrder.map((e) => ({
        id: e.id,
        game_id: game.id,
        order_number: e.orderNumber,
        member_id: asMemberId(e.playerId),
        guest_player_id: asGuestPlayerId(e.playerId),
        position: e.position,
      }));
      const { error: insErr } = await this.supabase
        .from("batting_order_entries")
        .insert(rows);
      if (insErr) {
        throw new Error(`打順の保存に失敗しました: ${insErr.message}`);
      }
    }
  }

  async findAllByTeam(teamId: TeamId): Promise<Game[]> {
    const { data, error } = await this.supabase
      .from("games")
      .select("*")
      .eq("team_id", teamId)
      .order("game_date", { ascending: false });
    if (error) {
      throw new Error(`試合一覧の取得に失敗しました: ${error.message}`);
    }
    // 一覧では軽量化のため打順は読み込まない
    return (data ?? []).map((row) =>
      Game.restore({
        id: row.id as GameId,
        teamId: row.team_id as TeamId,
        gameDate: new Date(row.game_date),
        opponentName: row.opponent_name,
        battingOrder: [],
      }),
    );
  }

  async findById(id: GameId): Promise<Game | null> {
    const { data: gameRow, error: gameErr } = await this.supabase
      .from("games")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (gameErr) {
      throw new Error(`試合の取得に失敗しました: ${gameErr.message}`);
    }
    if (!gameRow) return null;

    const { data: entryRows, error: entryErr } = await this.supabase
      .from("batting_order_entries")
      .select("*")
      .eq("game_id", id)
      .order("order_number", { ascending: true });
    if (entryErr) {
      throw new Error(`打順の取得に失敗しました: ${entryErr.message}`);
    }

    const battingOrder = (entryRows ?? []).map((row) =>
      this.toBattingOrderEntry(row as BattingOrderRow),
    );

    return Game.restore({
      id: gameRow.id as GameId,
      teamId: gameRow.team_id as TeamId,
      gameDate: new Date(gameRow.game_date),
      opponentName: gameRow.opponent_name,
      battingOrder,
    });
  }

  private toBattingOrderEntry(row: BattingOrderRow): BattingOrderEntry {
    let playerId: PlayerId;
    if (row.member_id) {
      playerId = memberPlayerId(row.member_id as MemberId);
    } else if (row.guest_player_id) {
      playerId = guestPlayerId(row.guest_player_id as GuestPlayerIdBrand);
    } else {
      throw new Error(
        `打順エントリにメンバーも助っ人も紐づいていません: ${row.id}`,
      );
    }

    let position: FielderPosition | null = null;
    if (row.position !== null) {
      if (!isFielderPosition(row.position)) {
        throw new Error(`不正な守備位置が保存されています: ${row.position}`);
      }
      position = row.position;
    }

    return BattingOrderEntry.restore({
      id: row.id as BattingOrderEntryId,
      orderNumber: row.order_number,
      playerId,
      position,
    });
  }
}

function toDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
