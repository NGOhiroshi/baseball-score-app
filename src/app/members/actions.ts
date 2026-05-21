"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegisterMemberUseCase } from "@/contexts/team-management/application/register-member.usecase";
import { MemberSupabaseRepository } from "@/contexts/team-management/infrastructure/member.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import { isMemberRole } from "@/contexts/team-management/domain/member-role";

/**
 * メンバー登録 Server Action（UC-TEAM-1）。
 *
 * Next.js の `"use server"` 注釈で、フォーム送信先として呼べる関数を作る。
 * クライアントからは普通のフォーム POST だが、実体はサーバー側で実行される。
 *
 * この関数の責務:
 *   - フォーム入力のパース・基本バリデーション（境界での型変換）
 *   - ユースケースの組み立て・呼び出し
 *   - 結果に応じた遷移（成功 → /members、失敗 → エラー throw）
 *
 * ⚠️ ドメインロジック（名前の長さ等）はここに書かない。Member クラスが守る。
 */
export async function registerMemberAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "");
  const role = String(formData.get("role") ?? "");
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;

  if (!isMemberRole(role)) {
    throw new Error(`不正な権限が指定されました: ${role}`);
  }

  const supabase = await createClient();
  const repo = new MemberSupabaseRepository(supabase);
  const usecase = new RegisterMemberUseCase(repo);

  const result = await usecase.execute({
    teamId: SMITH_BROTHERS_TEAM_ID,
    name,
    role,
    photoUrl,
  });

  if (!result.ok) {
    throw result.error;
  }

  // 一覧ページのキャッシュを破棄して最新の状態を取得させる
  revalidatePath("/members");
  redirect("/members");
}
