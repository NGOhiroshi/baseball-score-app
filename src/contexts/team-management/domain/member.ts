import { newMemberId, type MemberId } from "./member-id";
import type { MemberRole } from "./member-role";
import type { TeamId } from "./team-id";

const MAX_NAME_LENGTH = 50;

/**
 * メンバーエンティティ。
 *
 * - ID を持ち、ライフサイクルを通じて同一性が保たれる → エンティティ
 * - 不変条件（名前は空でない、長さ50以下）はコンストラクタで強制
 * - 新規登録は static factory `register()` 経由（ID/joinedAt の生成を内包）
 * - 既存データの復元は `restore()` 経由（リポジトリから読み出すときに使う）
 *
 * 設計上のポイント:
 *   不正な状態のインスタンスが**そもそも作れない**ことを型と例外で保証する。
 *   バリデーションをここに集約することで、UI/インフラから漏れた不正データを止められる。
 */
export class Member {
  private constructor(
    readonly id: MemberId,
    readonly teamId: TeamId,
    readonly name: string,
    readonly photoUrl: string | null,
    readonly role: MemberRole,
    readonly joinedAt: Date,
  ) {
    if (name.trim() === "") {
      throw new Error("メンバー名は必須です");
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(`メンバー名は${MAX_NAME_LENGTH}文字以内で入力してください`);
    }
  }

  /** 新規メンバー登録時に使う。ID と joinedAt はここで採番。 */
  static register(params: {
    teamId: TeamId;
    name: string;
    role: MemberRole;
    photoUrl?: string | null;
  }): Member {
    return new Member(
      newMemberId(),
      params.teamId,
      params.name.trim(),
      params.photoUrl ?? null,
      params.role,
      new Date(),
    );
  }

  /** リポジトリから読み出した永続化済みデータをドメインオブジェクトに戻す。 */
  static restore(params: {
    id: MemberId;
    teamId: TeamId;
    name: string;
    photoUrl: string | null;
    role: MemberRole;
    joinedAt: Date;
  }): Member {
    return new Member(
      params.id,
      params.teamId,
      params.name,
      params.photoUrl,
      params.role,
      params.joinedAt,
    );
  }
}
