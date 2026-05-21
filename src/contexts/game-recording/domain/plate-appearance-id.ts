import { type Brand, generateId } from "@/shared/domain/identity";

/** 打席の識別子（値オブジェクト） */
export type PlateAppearanceId = Brand<string, "PlateAppearanceId">;

export function newPlateAppearanceId(): PlateAppearanceId {
  return generateId() as PlateAppearanceId;
}
