import { Err, Ok, type Result } from "@/shared/domain/result";
import type { MemberId } from "../domain/member-id";
import type { MemberRepository } from "../domain/member.repository";

export type LinkMemberAccountInput = {
  memberId: MemberId;
  email: string;
  authUserId: string;
};

/**
 * メンバーにログインアカウント（メール＋認証ユーザー）を紐付けるユースケース。
 *
 * 認証ユーザーの作成そのもの（service_role が必要な auth.admin 操作）は
 * Server Action 側で行い、ここは **ドメインの永続化**（既存メンバーへの紐付け）
 * に専念する。すでにアカウントを持つメンバーへの二重発行は弾く。
 */
export class LinkMemberAccountUseCase {
  constructor(private readonly memberRepo: MemberRepository) {}

  async execute(input: LinkMemberAccountInput): Promise<Result<void, Error>> {
    try {
      const member = await this.memberRepo.findById(input.memberId);
      if (!member) {
        return Err(new Error(`メンバーが見つかりません: ${input.memberId}`));
      }
      if (member.hasAccount) {
        return Err(new Error("このメンバーには既にアカウントが発行されています"));
      }
      await this.memberRepo.save(member.withAccount(input.email, input.authUserId));
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
