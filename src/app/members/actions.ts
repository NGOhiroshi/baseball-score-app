"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RegisterMemberUseCase } from "@/contexts/team-management/application/register-member.usecase";
import { LinkMemberAccountUseCase } from "@/contexts/team-management/application/link-member-account.usecase";
import { MemberSupabaseRepository } from "@/contexts/team-management/infrastructure/member.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import { isMemberRole } from "@/contexts/team-management/domain/member-role";
import { requireAdmin } from "@/lib/auth/current-member";

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

export type BulkIssueItem = { memberId: string; email: string };
export type BulkIssueResult = {
  memberId: string;
  email: string;
  ok: boolean;
  error?: string;
};

/**
 * 選択した複数メンバーへ、共通の仮パスワードでログインアカウントを一括発行する
 * Server Action（管理者のみ）。
 *
 * メールは送らず、共通仮パスは呼び出し元（クライアント）が生成して渡す前提。
 * 1人ずつ処理し、メール重複などで失敗したメンバーがいても他は続行する
 * （部分的成功を許容し、結果を per-member で返す）。
 */
export async function issueAccountsBulkAction(
  items: BulkIssueItem[],
  sharedPassword: string,
): Promise<{ results: BulkIssueResult[] }> {
  await requireAdmin();

  if (sharedPassword.length < 8) {
    throw new Error("共通パスワードは8文字以上にしてください");
  }
  if (items.length === 0) {
    throw new Error("発行対象が選択されていません");
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const repo = new MemberSupabaseRepository(supabase);
  const link = new LinkMemberAccountUseCase(repo);

  const results: BulkIssueResult[] = [];
  for (const item of items) {
    const email = item.email.trim().toLowerCase();
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("メールアドレスの形式が正しくありません");
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: sharedPassword,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(
          error?.message.toLowerCase().includes("already")
            ? "このメールアドレスは既に使われています"
            : (error?.message ?? "アカウント作成に失敗しました"),
        );
      }
      const res = await link.execute({
        memberId: item.memberId as MemberId,
        email,
        authUserId: data.user.id,
      });
      if (!res.ok) {
        await admin.auth.admin.deleteUser(data.user.id);
        throw res.error;
      }
      results.push({ memberId: item.memberId, email, ok: true });
    } catch (e) {
      results.push({
        memberId: item.memberId,
        email,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  revalidatePath("/members");
  return { results };
}

/**
 * 既にアカウントを持つメンバーの仮パスワードを再発行する Server Action（管理者のみ）。
 *
 * 管理者が初回の仮パスを控え忘れた／本人が忘れた場合に、新しい仮パスを生成して
 * 返す（メールは送らない）。本人は次回ログイン後に変更できる。
 */
export async function resetMemberPasswordAction(
  memberId: string,
): Promise<{ tempPassword: string }> {
  await requireAdmin();

  const supabase = await createClient();
  const repo = new MemberSupabaseRepository(supabase);
  const member = await repo.findById(memberId as MemberId);
  if (!member) {
    throw new Error("メンバーが見つかりません");
  }
  if (!member.authUserId) {
    throw new Error("このメンバーはまだアカウント未発行です");
  }

  const tempPassword = randomUUID().replace(/-/g, "").slice(0, 12);
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(member.authUserId, {
    password: tempPassword,
  });
  if (error) {
    throw new Error(`仮パスワードの再発行に失敗しました: ${error.message}`);
  }

  return { tempPassword };
}
