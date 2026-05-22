import { type Brand, generateId } from "@/shared/domain/identity";

/** 投手登板の識別子（値オブジェクト） */
export type PitchingAppearanceId = Brand<string, "PitchingAppearanceId">;

export function newPitchingAppearanceId(): PitchingAppearanceId {
  return generateId() as PitchingAppearanceId;
}
