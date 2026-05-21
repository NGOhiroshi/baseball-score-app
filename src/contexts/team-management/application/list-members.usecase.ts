import type { Member } from "../domain/member";
import type { MemberRepository } from "../domain/member.repository";
import type { TeamId } from "../domain/team-id";

/**
 * メンバー一覧取得ユースケース（UC-TEAM-5）。
 *
 * 読み取り系のシンプルなユースケース。
 * リポジトリに問い合わせて結果をそのまま返すだけ。
 */
export class ListMembersUseCase {
  constructor(private readonly memberRepo: MemberRepository) {}

  async execute(teamId: TeamId): Promise<Member[]> {
    return this.memberRepo.findAllByTeam(teamId);
  }
}
