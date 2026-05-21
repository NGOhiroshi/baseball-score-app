import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListMembersUseCase } from "@/contexts/team-management/application/list-members.usecase";
import { MemberSupabaseRepository } from "@/contexts/team-management/infrastructure/member.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";

/**
 * メンバー一覧画面（UC-TEAM-5）。
 *
 * Server Component として実装し、サーバー側でユースケースを直接呼ぶ。
 * クライアントへ流れるのは表示用データだけ（軽量）。
 */
export default async function MembersPage() {
  const supabase = await createClient();
  const repo = new MemberSupabaseRepository(supabase);
  const usecase = new ListMembersUseCase(repo);
  const members = await usecase.execute(SMITH_BROTHERS_TEAM_ID);

  return (
    <main className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">👥 メンバー</h1>
        <Link
          href="/members/new"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + 新規
        </Link>
      </div>

      {members.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          まだメンバーがいません。「+ 新規」から登録してください。
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md border bg-card p-4"
            >
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  {m.role === "admin" ? "管理者" : "一般メンバー"}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                登録: {m.joinedAt.toLocaleDateString("ja-JP")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
