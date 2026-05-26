import { Err, Ok, type Result } from "@/shared/domain/result";
import type { MemberId } from "../domain/member-id";
import type { MemberRepository } from "../domain/member.repository";

export type UpdateMemberJerseyNumbersInput = {
  memberId: MemberId;
  jerseyNumberMain: number | null;
  jerseyNumberSub: number | null;
};

/**
 * 既存メンバーの背番号（メイン/サブ）を更新するユースケース。
 * 不変条件（0〜999、整数）は `Member` 側のコンストラクタが検証する。
 */
export class UpdateMemberJerseyNumbersUseCase {
  constructor(private readonly memberRepo: MemberRepository) {}

  async execute(
    input: UpdateMemberJerseyNumbersInput,
  ): Promise<Result<void, Error>> {
    try {
      const member = await this.memberRepo.findById(input.memberId);
      if (!member) {
        return Err(new Error(`メンバーが見つかりません: ${input.memberId}`));
      }
      await this.memberRepo.save(
        member.withJerseyNumbers(input.jerseyNumberMain, input.jerseyNumberSub),
      );
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
