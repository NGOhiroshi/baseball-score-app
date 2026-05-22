import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/current-member";
import { GetTeamSettingsUseCase } from "@/contexts/team-management/application/get-team-settings.usecase";
import { TeamSettingsSupabaseRepository } from "@/contexts/team-management/infrastructure/team-settings.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import { ThemeToggle } from "./ThemeToggle";
import { ChangePassword } from "./ChangePassword";
import { LogoutButton } from "./LogoutButton";
import { TeamSettingsForm } from "./TeamSettingsForm";

export default async function SettingsPage() {
  const member = await getCurrentMember();
  const isAdmin = member?.role === "admin";

  let teamSettings = null;
  if (isAdmin) {
    const supabase = await createClient();
    const repo = new TeamSettingsSupabaseRepository(supabase);
    teamSettings = await new GetTeamSettingsUseCase(repo).execute(
      SMITH_BROTHERS_TEAM_ID,
    );
  }

  return (
    <main className="container py-8">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← ホーム
        </Link>
      </div>

      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">⚙️ 設定</h1>
      </header>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">表示</h2>
        <ThemeToggle />
      </section>

      {isAdmin && teamSettings && (
        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            チーム設定（管理者）
          </h2>
          <TeamSettingsForm
            initialPaPerGame={teamSettings.qualifiedPaPerGame}
            initialInningsPerGame={teamSettings.qualifiedInningsPerGame}
          />
        </section>
      )}

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">アカウント</h2>
        <ChangePassword />
        <LogoutButton />
      </section>
    </main>
  );
}
