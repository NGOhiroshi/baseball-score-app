import type { MemberId } from "@/contexts/team-management/domain/member-id";

/**
 * 「選手」の識別子。
 *
 * 草野球の試合では、メンバー（チーム所属の選手）と
 * 助っ人（試合限りの臨時選手）の両方が打席に立つ。
 * このため `PlayerId` は両者を区別できる **合成型（判別共用体）** にする。
 *
 * DDD的ポイント:
 *   ドメインモデルでは「選手は2種類いる」を型レベルで表現する。
 *   DBでは2つの nullable FK カラムにマッピングされる（リポジトリで変換）。
 *
 * NOTE: GuestPlayerId は Phase 1-D Slice 2.5 で team-management に導入予定。
 *       MVP の Slice 2 ではメンバーのみで打順を組めれば十分。
 */
export type PlayerId =
  | { kind: "member"; id: MemberId }
  | { kind: "guest"; id: GuestPlayerIdBrand };

// 助っ人IDは Slice 2.5 で正式に team-management/domain に定義する。
// それまでのプレースホルダ。
export type GuestPlayerIdBrand = string & { readonly __brand: "GuestPlayerId" };

export function memberPlayerId(id: MemberId): PlayerId {
  return { kind: "member", id };
}

export function guestPlayerId(id: GuestPlayerIdBrand): PlayerId {
  return { kind: "guest", id };
}

/** メンバーIDを取り出す（メンバーでない場合は null） */
export function asMemberId(playerId: PlayerId): MemberId | null {
  return playerId.kind === "member" ? playerId.id : null;
}

/** 助っ人IDを取り出す（助っ人でない場合は null） */
export function asGuestPlayerId(playerId: PlayerId): GuestPlayerIdBrand | null {
  return playerId.kind === "guest" ? playerId.id : null;
}
