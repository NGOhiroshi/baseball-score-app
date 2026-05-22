import type { SupabaseClient } from "@supabase/supabase-js";
import { Member } from "../domain/member";
import { type MemberId } from "../domain/member-id";
import {
  isMemberRole,
  type MemberRole,
} from "../domain/member-role";
import type { MemberRepository } from "../domain/member.repository";
import type { TeamId } from "../domain/team-id";

type MemberRow = {
  id: string;
  team_id: string;
  name: string;
  photo_url: string | null;
  role: string;
  joined_at: string; // YYYY-MM-DD
  email: string | null;
  auth_user_id: string | null;
};

/**
 * MemberRepository の Supabase 実装。
 *
 * DDDのキーポイント（依存方向）:
 *   domain/ にある `MemberRepository` インターフェースをここで実装する。
 *   インフラ層は domain に依存する（逆ではない）。
 *
 * このクラスの責務:
 *   - Member エンティティ ↔ DBの行（snake_case）の変換
 *   - Supabase クエリの組み立て
 *   - エラーをドメイン向けに翻訳（必要なら）
 */
export class MemberSupabaseRepository implements MemberRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(member: Member): Promise<void> {
    const { error } = await this.supabase.from("members").upsert({
      id: member.id,
      team_id: member.teamId,
      name: member.name,
      photo_url: member.photoUrl,
      role: member.role,
      joined_at: toDateOnly(member.joinedAt),
      email: member.email,
      auth_user_id: member.authUserId,
    });
    if (error) {
      throw new Error(`メンバーの保存に失敗しました: ${error.message}`);
    }
  }

  async findAllByTeam(teamId: TeamId): Promise<Member[]> {
    const { data, error } = await this.supabase
      .from("members")
      .select("*")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });
    if (error) {
      throw new Error(`メンバー一覧の取得に失敗しました: ${error.message}`);
    }
    return (data ?? []).map((row) => this.toDomain(row as MemberRow));
  }

  async findById(id: MemberId): Promise<Member | null> {
    const { data, error } = await this.supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new Error(`メンバーの取得に失敗しました: ${error.message}`);
    }
    return data ? this.toDomain(data as MemberRow) : null;
  }

  async findByAuthUserId(authUserId: string): Promise<Member | null> {
    const { data, error } = await this.supabase
      .from("members")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) {
      throw new Error(`メンバーの取得に失敗しました: ${error.message}`);
    }
    return data ? this.toDomain(data as MemberRow) : null;
  }

  /** DB行 → ドメインオブジェクトへの変換 */
  private toDomain(row: MemberRow): Member {
    if (!isMemberRole(row.role)) {
      throw new Error(`不正な role が DB に保存されています: ${row.role}`);
    }
    return Member.restore({
      id: row.id as MemberId,
      teamId: row.team_id as TeamId,
      name: row.name,
      photoUrl: row.photo_url,
      role: row.role as MemberRole,
      joinedAt: new Date(row.joined_at),
      email: row.email,
      authUserId: row.auth_user_id,
    });
  }
}

function toDateOnly(d: Date): string {
  // PostgreSQL DATE 型用に YYYY-MM-DD にフォーマット
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
