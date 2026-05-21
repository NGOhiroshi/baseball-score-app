import { type Brand, generateId } from "@/shared/domain/identity";

/**
 * 試合の識別子（値オブジェクト）。
 */
export type GameId = Brand<string, "GameId">;

export function newGameId(): GameId {
  return generateId() as GameId;
}
