import { newMemberId, type MemberId } from "./member-id";
import type { MemberRole } from "./member-role";
import type { TeamId } from "./team-id";

const MAX_NAME_LENGTH = 50;
const MAX_JERSEY_NUMBER = 999;

function validateJerseyNumber(n: number | null, label: string): void {
  if (n === null) return;
  if (!Number.isInteger(n) || n < 0 || n > MAX_JERSEY_NUMBER) {
    throw new Error(
      `${label}は0以上${MAX_JERSEY_NUMBER}以下の整数で入力してください（受信: ${n}）`,
    );
  }
}

/**
 * メンバーエンティティ。
 *
 * - ID を持ち、ライフサイクルを通じて同一性が保たれる → エンティティ
 * - 不変条件（名前は空でない、長さ50以下、背番号は0〜999）はコンストラクタで強制
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
    /** ログイン用メール（未発行なら null） */
    readonly email: string | null,
    /** 紐づく認証アカウント（auth.users.id）。ログイン未発行なら null */
    readonly authUserId: string | null,
    /** メインの背番号（未設定なら null） */
    readonly jerseyNumberMain: number | null,
    /** サブの背番号（別ユニフォーム用、未設定なら null） */
    readonly jerseyNumberSub: number | null,
  ) {
    if (name.trim() === "") {
      throw new Error("メンバー名は必須です");
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(`メンバー名は${MAX_NAME_LENGTH}文字以内で入力してください`);
    }
    validateJerseyNumber(jerseyNumberMain, "メイン背番号");
    validateJerseyNumber(jerseyNumberSub, "サブ背番号");
  }

  /** ログインアカウントを持つか（管理者が発行済みか） */
  get hasAccount(): boolean {
    return this.authUserId !== null;
  }

  /** 新規メンバー登録時に使う。ID と joinedAt はここで採番。 */
  static register(params: {
    teamId: TeamId;
    name: string;
    role: MemberRole;
    photoUrl?: string | null;
    jerseyNumberMain?: number | null;
    jerseyNumberSub?: number | null;
  }): Member {
    return new Member(
      newMemberId(),
      params.teamId,
      params.name.trim(),
      params.photoUrl ?? null,
      params.role,
      new Date(),
      null,
      null,
      params.jerseyNumberMain ?? null,
      params.jerseyNumberSub ?? null,
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
    email: string | null;
    authUserId: string | null;
    jerseyNumberMain: number | null;
    jerseyNumberSub: number | null;
  }): Member {
    return new Member(
      params.id,
      params.teamId,
      params.name,
      params.photoUrl,
      params.role,
      params.joinedAt,
      params.email,
      params.authUserId,
      params.jerseyNumberMain,
      params.jerseyNumberSub,
    );
  }

  /**
   * ログインアカウントを紐付けた新しいインスタンスを返す（不変更新）。
   * 管理者がメンバーにメール＋認証アカウントを発行したときに使う。
   */
  withAccount(email: string, authUserId: string): Member {
    return new Member(
      this.id,
      this.teamId,
      this.name,
      this.photoUrl,
      this.role,
      this.joinedAt,
      email,
      authUserId,
      this.jerseyNumberMain,
      this.jerseyNumberSub,
    );
  }

  /**
   * 背番号（メイン/サブ）を差し替えた新しいインスタンスを返す（不変更新）。
   * 既存メンバーへの番号付与・変更に使う。
   */
  withJerseyNumbers(main: number | null, sub: number | null): Member {
    return new Member(
      this.id,
      this.teamId,
      this.name,
      this.photoUrl,
      this.role,
      this.joinedAt,
      this.email,
      this.authUserId,
      main,
      sub,
    );
  }
}
