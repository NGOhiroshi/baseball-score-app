import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListMembersUseCase } from "@/contexts/team-management/application/list-members.usecase";
import { MemberSupabaseRepository } from "@/contexts/team-management/infrastructure/member.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import { getCurrentMember } from "@/lib/auth/current-member";
import { MembersList, type MemberRowView } from "./MembersList";

/**
 * メンバー一覧画面（UC-TEAM-5）。
 *
 * Server Component でユースケースを呼び、表示用データだけをクライアントへ渡す。
 * 管理者にはアカウント発行UIを出すため、ログイン中メンバーのロールも取得する。
 */
export default async function MembersPage() {
  const supabase = await createClient();
  const repo = new MemberSupabaseRepository(supabase);
  const [members, currentMember] = await Promise.all([
    new ListMembersUseCase(repo).execute(SMITH_BROTHERS_TEAM_ID),
    getCurrentMember(),
  ]);
  const isAdmin = currentMember?.role === "admin";

  const rows: MemberRowView[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    roleLabel: m.role === "admin" ? "管理者" : "一般メンバー",
    hasAccount: m.hasAccount,
    email: m.email,
    joinedAt: m.joinedAt.toLocaleDateString("ja-JP"),
    jerseyNumberMain: m.jerseyNumberMain,
    jerseyNumberSub: m.jerseyNumberSub,
  }));

  return (
    <main className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">👥 メンバー</h1>
        {isAdmin && (
          <Link
            href="/members/new"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            + 新規
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          まだメンバーがいません。「+ 新規」から登録してください。
        </p>
      ) : (
        <MembersList rows={rows} isAdmin={isAdmin} />
      )}
    </main>
  );
}
