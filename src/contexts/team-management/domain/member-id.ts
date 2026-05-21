import { type Brand, generateId } from "@/shared/domain/identity";

/**
 * メンバーの識別子（値オブジェクト）。
 */
export type MemberId = Brand<string, "MemberId">;

export function newMemberId(): MemberId {
  return generateId() as MemberId;
}
