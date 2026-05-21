import { type Brand, generateId } from "@/shared/domain/identity";

/**
 * 助っ人選手の識別子（値オブジェクト）。
 * MemberId と取り違えないよう Brand 型で区別する。
 */
export type GuestPlayerId = Brand<string, "GuestPlayerId">;

export function newGuestPlayerId(): GuestPlayerId {
  return generateId() as GuestPlayerId;
}
