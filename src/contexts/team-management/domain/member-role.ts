/**
 * メンバーの権限を表す値オブジェクト。
 * - admin: チーム情報の編集、機密情報閲覧などができる
 * - regular: 通常の閲覧・スコア入力権限
 *
 * union 型として表現することで、不正な文字列をコンパイル時に弾く。
 */
export type MemberRole = "admin" | "regular";

const ALL_ROLES: readonly MemberRole[] = ["admin", "regular"] as const;

/** 任意の文字列が MemberRole かどうかを判定（Type guard） */
export function isMemberRole(value: string): value is MemberRole {
  return (ALL_ROLES as readonly string[]).includes(value);
}
