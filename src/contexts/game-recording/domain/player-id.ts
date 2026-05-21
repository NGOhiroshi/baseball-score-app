import type { GuestPlayerId } from "@/contexts/team-management/domain/guest-player-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";

/**
 * 「選手」の識別子。
 *
 * 草野球の試合では、メンバー（チーム所属の選手）と
 * 助っ人（試合限りの臨時選手）の両方が打席に立つ。
 * このため `PlayerId` は両者を区別できる **判別共用体** にする。
 *
 * DDD的ポイント:
 *   ドメインモデルでは「選手は2種類いる」を型レベルで表現する。
 *   DBでは2つの nullable FK カラム（member_id / guest_player_id）
 *   にマッピングされる（リポジトリで変換）。
 *
 * NOTE: MemberId / GuestPlayerId は team-management コンテキスト所有。
 *       game-recording はそれらを **ID として参照するだけ**で、
 *       Member / GuestPlayer エンティティ本体は持たない。
 *       これがコンテキスト間の疎結合のあり方。
 */
export type PlayerId =
  | { kind: "member"; id: MemberId }
  | { kind: "guest"; id: GuestPlayerId };

export function memberPlayerId(id: MemberId): PlayerId {
  return { kind: "member", id };
}

export function guestPlayerId(id: GuestPlayerId): PlayerId {
  return { kind: "guest", id };
}

/** メンバーIDを取り出す（メンバーでない場合は null） */
export function asMemberId(playerId: PlayerId): MemberId | null {
  return playerId.kind === "member" ? playerId.id : null;
}

/** 助っ人IDを取り出す（助っ人でない場合は null） */
export function asGuestPlayerId(playerId: PlayerId): GuestPlayerId | null {
  return playerId.kind === "guest" ? playerId.id : null;
}
