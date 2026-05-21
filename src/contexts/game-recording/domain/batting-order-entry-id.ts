import { type Brand, generateId } from "@/shared/domain/identity";

/**
 * 打順エントリの識別子（値オブジェクト）。
 */
export type BattingOrderEntryId = Brand<string, "BattingOrderEntryId">;

export function newBattingOrderEntryId(): BattingOrderEntryId {
  return generateId() as BattingOrderEntryId;
}
