"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/current-member";
import { UpdateTeamSettingsUseCase } from "@/contexts/team-management/application/update-team-settings.usecase";
import { TeamSettingsSupabaseRepository } from "@/contexts/team-management/infrastructure/team-settings.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";

/**
 * チーム設定（規定打席・規定投球回の係数）を更新する Server Action（管理者のみ）。
 *
 * teams テーブルの更新は service_role（RLS貫通）で行い、認可は requireAdmin で担保。
 */
export async function updateTeamSettingsAction(
  qualifiedPaPerGame: number,
  qualifiedInningsPerGame: number,
): Promise<void> {
  await requireAdmin();

  const admin = createAdminClient();
  const repo = new TeamSettingsSupabaseRepository(admin);
  const res = await new UpdateTeamSettingsUseCase(repo).execute({
    teamId: SMITH_BROTHERS_TEAM_ID,
    qualifiedPaPerGame,
    qualifiedInningsPerGame,
  });
  if (!res.ok) {
    throw res.error;
  }

  revalidatePath("/settings");
  revalidatePath("/stats");
}
