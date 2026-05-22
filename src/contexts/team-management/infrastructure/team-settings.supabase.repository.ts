import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamId } from "../domain/team-id";
import { TeamSettings } from "../domain/team-settings";
import type { TeamSettingsRepository } from "../domain/team-settings.repository";

type TeamSettingsRow = {
  qualified_pa_per_game: number | string | null;
  qualified_innings_per_game: number | string | null;
};

/**
 * TeamSettings の Supabase 実装。teams テーブルの係数カラムを読み書きする。
 */
export class TeamSettingsSupabaseRepository implements TeamSettingsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async get(teamId: TeamId): Promise<TeamSettings> {
    const { data, error } = await this.supabase
      .from("teams")
      .select("qualified_pa_per_game, qualified_innings_per_game")
      .eq("id", teamId)
      .maybeSingle();
    if (error) {
      throw new Error(`チーム設定の取得に失敗しました: ${error.message}`);
    }
    if (!data) return TeamSettings.default();
    const row = data as TeamSettingsRow;
    if (
      row.qualified_pa_per_game === null ||
      row.qualified_innings_per_game === null
    ) {
      return TeamSettings.default();
    }
    return new TeamSettings(
      Number(row.qualified_pa_per_game),
      Number(row.qualified_innings_per_game),
    );
  }

  async save(teamId: TeamId, settings: TeamSettings): Promise<void> {
    const { error } = await this.supabase
      .from("teams")
      .update({
        qualified_pa_per_game: settings.qualifiedPaPerGame,
        qualified_innings_per_game: settings.qualifiedInningsPerGame,
      })
      .eq("id", teamId);
    if (error) {
      throw new Error(`チーム設定の保存に失敗しました: ${error.message}`);
    }
  }
}
