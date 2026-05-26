import { Member } from "../domain/member";
import type { MemberId } from "../domain/member-id";
import type { MemberRole } from "../domain/member-role";
import type { MemberRepository } from "../domain/member.repository";
import type { TeamId } from "../domain/team-id";
import { Err, Ok, type Result } from "@/shared/domain/result";

export type RegisterMemberInput = {
  teamId: TeamId;
  name: string;
  role: MemberRole;
  photoUrl?: string | null;
  jerseyNumberMain?: number | null;
  jerseyNumberSub?: number | null;
};

/**
 * メンバー登録ユースケース（UC-TEAM-1）。
 *
 * アプリケーションサービスの典型例:
 *   1. 入力をもとにドメインオブジェクトを生成（不変条件はここで弾かれる）
 *   2. リポジトリに保存
 *   3. 結果を Result 型で返す（例外を投げない）
 *
 * このクラスに**ドメインルールは書かない**。
 * 名前のバリデーション等は Member クラスの責務。
 */
export class RegisterMemberUseCase {
  constructor(private readonly memberRepo: MemberRepository) {}

  async execute(input: RegisterMemberInput): Promise<Result<MemberId, Error>> {
    try {
      const member = Member.register({
        teamId: input.teamId,
        name: input.name,
        role: input.role,
        photoUrl: input.photoUrl ?? null,
        jerseyNumberMain: input.jerseyNumberMain ?? null,
        jerseyNumberSub: input.jerseyNumberSub ?? null,
      });
      await this.memberRepo.save(member);
      return Ok(member.id);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
