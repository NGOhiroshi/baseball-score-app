import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuestPlayerId } from "@/contexts/team-management/domain/guest-player-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { TeamId } from "@/contexts/team-management/domain/team-id";
import { BattingOrderEntry } from "../domain/batting-order-entry";
import type { BattingOrderEntryId } from "../domain/batting-order-entry-id";
import type { BatResult } from "../domain/bat-result";
import {
  isFielderPosition,
  type FielderPosition,
} from "../domain/fielder-position";
import { Game } from "../domain/game";
import type { GameId } from "../domain/game-id";
import type { GameRepository } from "../domain/game.repository";
import { InningScore } from "../domain/inning-score";
import { InningPitched } from "../domain/inning-pitched";
import { PitchingAppearance } from "../domain/pitching-appearance";
import type { PitchingAppearanceId } from "../domain/pitching-appearance-id";
import { PlateAppearance } from "../domain/plate-appearance";
import type { PlateAppearanceId } from "../domain/plate-appearance-id";
import {
  asGuestPlayerId,
  asMemberId,
  guestPlayerId,
  memberPlayerId,
  playerKey,
  type PlayerId,
} from "../domain/player-id";

type GameRow = {
  id: string;
  team_id: string;
  game_date: string;
  opponent_name: string;
  bats_first: boolean;
};

type BattingOrderRow = {
  id: string;
  game_id: string;
  order_number: number;
  member_id: string | null;
  guest_player_id: string | null;
  position: number | null;
};

type InningScoreRow = {
  id: string;
  game_id: string;
  inning_number: number;
  our_score: number;
  opponent_score: number;
};

type PlateAppearanceRow = {
  id: string;
  game_id: string;
  member_id: string | null;
  guest_player_id: string | null;
  inning: number;
  sequence_in_inning: number;
  result_category: string;
  hit_type: string | null;
  walk_type: string | null;
  out_type: string | null;
  sacrifice_type: string | null;
  had_error: boolean;
  batting_direction: string | null;
  fielder_position: number | null;
  runs_batted_in: number;
  run_scored: boolean;
};

type PitchingAppearanceRow = {
  id: string;
  game_id: string;
  pitcher_member_id: string | null;
  pitcher_guest_player_id: string | null;
  entered_at_inning: number;
};

type InningPitchedRow = {
  id: string;
  pitching_appearance_id: string;
  inning_number: number;
  outs_recorded: number;
  runs_allowed: number;
  earned_runs: number;
  hits_allowed: number;
  strikeouts: number;
  walks_allowed: number;
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
      bats_first: game.batsFirst,
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

    // 4) plate_appearances を一旦全削除
    const { error: paDelErr } = await this.supabase
      .from("plate_appearances")
      .delete()
      .eq("game_id", game.id);
    if (paDelErr) {
      throw new Error(`打席結果の削除に失敗しました: ${paDelErr.message}`);
    }

    // 5) 打席結果を挿入（あれば）
    if (game.plateAppearances.length > 0) {
      // 同一(選手, イニング)内の打席順を sequence_in_inning として採番
      const seqCounter = new Map<string, number>();
      const rows = game.plateAppearances.map((pa) => {
        const key = `${playerKey(pa.playerId)}#${pa.inning}`;
        const seq = (seqCounter.get(key) ?? 0) + 1;
        seqCounter.set(key, seq);
        return {
          id: pa.id,
          game_id: game.id,
          member_id: asMemberId(pa.playerId),
          guest_player_id: asGuestPlayerId(pa.playerId),
          inning: pa.inning,
          sequence_in_inning: seq,
          runs_batted_in: pa.runsBattedIn,
          run_scored: pa.runScored,
          ...batResultToColumns(pa.result),
        };
      });
      const { error: paInsErr } = await this.supabase
        .from("plate_appearances")
        .insert(rows);
      if (paInsErr) {
        throw new Error(`打席結果の保存に失敗しました: ${paInsErr.message}`);
      }
    }

    // 6) inning_scores を一旦全削除
    const { error: isDelErr } = await this.supabase
      .from("inning_scores")
      .delete()
      .eq("game_id", game.id);
    if (isDelErr) {
      throw new Error(`イニングスコアの削除に失敗しました: ${isDelErr.message}`);
    }

    // 7) イニングスコアを挿入（あれば）。InningScore は値オブジェクトなので
    //    id は持たず、DB側の DEFAULT gen_random_uuid() に任せる。
    if (game.inningScores.length > 0) {
      const rows = game.inningScores.map((s) => ({
        game_id: game.id,
        inning_number: s.inningNumber,
        our_score: s.ourScore,
        opponent_score: s.opponentScore,
      }));
      const { error: isInsErr } = await this.supabase
        .from("inning_scores")
        .insert(rows);
      if (isInsErr) {
        throw new Error(`イニングスコアの保存に失敗しました: ${isInsErr.message}`);
      }
    }

    // 8) pitching_appearances を全削除（inning_pitched_records は CASCADE で消える）
    const { error: paitDelErr } = await this.supabase
      .from("pitching_appearances")
      .delete()
      .eq("game_id", game.id);
    if (paitDelErr) {
      throw new Error(`投手記録の削除に失敗しました: ${paitDelErr.message}`);
    }

    // 9) 投手登板とイニング記録を挿入（あれば）
    if (game.pitchingAppearances.length > 0) {
      const appRows = game.pitchingAppearances.map((pa) => ({
        id: pa.id,
        game_id: game.id,
        pitcher_member_id: asMemberId(pa.pitcherId),
        pitcher_guest_player_id: asGuestPlayerId(pa.pitcherId),
        entered_at_inning: pa.enteredAtInning,
      }));
      const { error: appInsErr } = await this.supabase
        .from("pitching_appearances")
        .insert(appRows);
      if (appInsErr) {
        throw new Error(`投手登板の保存に失敗しました: ${appInsErr.message}`);
      }

      const inningRows = game.pitchingAppearances.flatMap((pa) =>
        pa.inningRecords.map((r) => ({
          pitching_appearance_id: pa.id,
          inning_number: r.inningNumber,
          outs_recorded: r.outsRecorded,
          runs_allowed: r.runsAllowed,
          earned_runs: r.earnedRuns,
          hits_allowed: r.hitsAllowed,
          strikeouts: r.strikeouts,
          walks_allowed: r.walksAllowed,
        })),
      );
      if (inningRows.length > 0) {
        const { error: inningInsErr } = await this.supabase
          .from("inning_pitched_records")
          .insert(inningRows);
        if (inningInsErr) {
          throw new Error(
            `投手イニング記録の保存に失敗しました: ${inningInsErr.message}`,
          );
        }
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
        plateAppearances: [],
        inningScores: [],
        batsFirst: row.bats_first ?? true,
        pitchingAppearances: [],
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

    const { data: paRows, error: paErr } = await this.supabase
      .from("plate_appearances")
      .select("*")
      .eq("game_id", id)
      .order("inning", { ascending: true })
      .order("sequence_in_inning", { ascending: true });
    if (paErr) {
      throw new Error(`打席結果の取得に失敗しました: ${paErr.message}`);
    }
    const plateAppearances = (paRows ?? []).map((row) =>
      this.toPlateAppearance(row as PlateAppearanceRow),
    );

    const { data: isRows, error: isErr } = await this.supabase
      .from("inning_scores")
      .select("*")
      .eq("game_id", id)
      .order("inning_number", { ascending: true });
    if (isErr) {
      throw new Error(`イニングスコアの取得に失敗しました: ${isErr.message}`);
    }
    const inningScores = (isRows ?? []).map((row) => {
      const r = row as InningScoreRow;
      return new InningScore(r.inning_number, r.our_score, r.opponent_score);
    });

    const { data: appRows, error: appErr } = await this.supabase
      .from("pitching_appearances")
      .select("*")
      .eq("game_id", id)
      .order("entered_at_inning", { ascending: true });
    if (appErr) {
      throw new Error(`投手登板の取得に失敗しました: ${appErr.message}`);
    }
    const appIds = (appRows ?? []).map((r) => (r as PitchingAppearanceRow).id);
    let inningRows: InningPitchedRow[] = [];
    if (appIds.length > 0) {
      const { data, error } = await this.supabase
        .from("inning_pitched_records")
        .select("*")
        .in("pitching_appearance_id", appIds)
        .order("inning_number", { ascending: true });
      if (error) {
        throw new Error(`投手イニング記録の取得に失敗しました: ${error.message}`);
      }
      inningRows = (data ?? []) as InningPitchedRow[];
    }
    const pitchingAppearances = (appRows ?? []).map((row) =>
      this.toPitchingAppearance(row as PitchingAppearanceRow, inningRows),
    );

    return Game.restore({
      id: gameRow.id as GameId,
      teamId: gameRow.team_id as TeamId,
      gameDate: new Date(gameRow.game_date),
      opponentName: gameRow.opponent_name,
      battingOrder,
      plateAppearances,
      inningScores,
      batsFirst: gameRow.bats_first ?? true,
      pitchingAppearances,
    });
  }

  private toPitchingAppearance(
    row: PitchingAppearanceRow,
    allInningRows: readonly InningPitchedRow[],
  ): PitchingAppearance {
    let pitcherId: PlayerId;
    if (row.pitcher_member_id) {
      pitcherId = memberPlayerId(row.pitcher_member_id as MemberId);
    } else if (row.pitcher_guest_player_id) {
      pitcherId = guestPlayerId(row.pitcher_guest_player_id as GuestPlayerId);
    } else {
      throw new Error(
        `投手登板にメンバーも助っ人も紐づいていません: ${row.id}`,
      );
    }

    const inningRecords = allInningRows
      .filter((r) => r.pitching_appearance_id === row.id)
      .map(
        (r) =>
          new InningPitched(
            r.inning_number,
            r.outs_recorded as 0 | 1 | 2 | 3,
            r.runs_allowed,
            r.earned_runs,
            r.hits_allowed,
            r.strikeouts,
            r.walks_allowed,
          ),
      );

    return PitchingAppearance.restore({
      id: row.id as PitchingAppearanceId,
      pitcherId,
      enteredAtInning: row.entered_at_inning,
      inningRecords,
    });
  }

  private toBattingOrderEntry(row: BattingOrderRow): BattingOrderEntry {
    let playerId: PlayerId;
    if (row.member_id) {
      playerId = memberPlayerId(row.member_id as MemberId);
    } else if (row.guest_player_id) {
      playerId = guestPlayerId(row.guest_player_id as GuestPlayerId);
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

  private toPlateAppearance(row: PlateAppearanceRow): PlateAppearance {
    let playerId: PlayerId;
    if (row.member_id) {
      playerId = memberPlayerId(row.member_id as MemberId);
    } else if (row.guest_player_id) {
      playerId = guestPlayerId(row.guest_player_id as GuestPlayerId);
    } else {
      throw new Error(
        `打席結果にメンバーも助っ人も紐づいていません: ${row.id}`,
      );
    }

    return PlateAppearance.restore({
      id: row.id as PlateAppearanceId,
      playerId,
      inning: row.inning,
      result: columnsToBatResult(row),
      runsBattedIn: row.runs_batted_in,
      runScored: row.run_scored,
    });
  }
}

// =========================================================================
// BatResult ↔ DB カラム の変換
//   ドメインの判別共用体と、plate_appearances テーブルのフラットな
//   カラム群との橋渡し。インフラ層の責務。
// =========================================================================

type BatResultColumns = {
  result_category: string;
  hit_type: string | null;
  walk_type: string | null;
  out_type: string | null;
  sacrifice_type: string | null;
  had_error: boolean;
  batting_direction: string | null;
  fielder_position: number | null;
};

function batResultToColumns(result: BatResult): BatResultColumns {
  const base: BatResultColumns = {
    result_category: result.category,
    hit_type: null,
    walk_type: null,
    out_type: null,
    sacrifice_type: null,
    had_error: false,
    batting_direction: null,
    fielder_position: null,
  };
  switch (result.category) {
    case "hit":
      return {
        ...base,
        hit_type: result.hitType,
        fielder_position: result.fielderPosition,
        had_error: result.hadError,
      };
    case "walk":
      return { ...base, walk_type: result.walkType };
    case "out":
      return {
        ...base,
        out_type: result.outType,
        fielder_position: result.fielderPosition,
      };
    case "sacrifice":
      return {
        ...base,
        sacrifice_type: result.sacrificeType,
        fielder_position: result.fielderPosition,
      };
    case "errorOnly":
      return { ...base, fielder_position: result.fielderPosition };
  }
}

function columnsToBatResult(row: PlateAppearanceRow): BatResult {
  const fielderPosition =
    row.fielder_position !== null && isFielderPosition(row.fielder_position)
      ? row.fielder_position
      : null;

  switch (row.result_category) {
    case "hit":
      return {
        category: "hit",
        hitType: row.hit_type as "single" | "double" | "triple" | "homerun",
        fielderPosition,
        hadError: row.had_error,
      };
    case "walk":
      return {
        category: "walk",
        walkType: row.walk_type as "baseOnBalls" | "hitByPitch",
      };
    case "out":
      return {
        category: "out",
        outType: row.out_type as "strikeout" | "groundOut" | "flyOut",
        fielderPosition,
      };
    case "sacrifice":
      return {
        category: "sacrifice",
        sacrificeType: row.sacrifice_type as "bunt" | "fly",
        fielderPosition,
      };
    case "errorOnly":
      return { category: "errorOnly", fielderPosition };
    default:
      throw new Error(
        `不正な打席結果カテゴリが保存されています: ${row.result_category}`,
      );
  }
}

function toDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
