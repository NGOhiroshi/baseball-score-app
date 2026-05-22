import { createClient } from "@/lib/supabase/server";
import { MemberSupabaseRepository } from "@/contexts/team-management/infrastructure/member.supabase.repository";
import type { Member } from "@/contexts/team-management/domain/member";

/**
 * ログイン中のユーザーに対応する Member を返す（未ログイン or 未紐付けなら null）。
 * auth.users.id → members.auth_user_id で引く。
 */
export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const repo = new MemberSupabaseRepository(supabase);
  return repo.findByAuthUserId(user.id);
}

/**
 * 管理者であることを要求する。管理者でなければ例外を投げる。
 * Server Action 冒頭の認可ガードに使う。
 */
export async function requireAdmin(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member || member.role !== "admin") {
    throw new Error("この操作には管理者権限が必要です");
  }
  return member;
}
