import type { SupabaseClient } from "@supabase/supabase-js";
import { GuestPlayer } from "../domain/guest-player";
import type { GuestPlayerId } from "../domain/guest-player-id";
import type { GuestPlayerRepository } from "../domain/guest-player.repository";
import type { TeamId } from "../domain/team-id";

type GuestPlayerRow = {
  id: string;
  team_id: string;
  name: string;
};

export class GuestPlayerSupabaseRepository implements GuestPlayerRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(guest: GuestPlayer): Promise<void> {
    const { error } = await this.supabase.from("guest_players").upsert({
      id: guest.id,
      team_id: guest.teamId,
      name: guest.name,
    });
    if (error) {
      throw new Error(`助っ人の保存に失敗しました: ${error.message}`);
    }
  }

  async findAllByTeam(teamId: TeamId): Promise<GuestPlayer[]> {
    const { data, error } = await this.supabase
      .from("guest_players")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });
    if (error) {
      throw new Error(`助っ人一覧の取得に失敗しました: ${error.message}`);
    }
    return (data ?? []).map((row) => this.toDomain(row as GuestPlayerRow));
  }

  async findById(id: GuestPlayerId): Promise<GuestPlayer | null> {
    const { data, error } = await this.supabase
      .from("guest_players")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new Error(`助っ人の取得に失敗しました: ${error.message}`);
    }
    return data ? this.toDomain(data as GuestPlayerRow) : null;
  }

  private toDomain(row: GuestPlayerRow): GuestPlayer {
    return GuestPlayer.restore({
      id: row.id as GuestPlayerId,
      teamId: row.team_id as TeamId,
      name: row.name,
    });
  }
}
