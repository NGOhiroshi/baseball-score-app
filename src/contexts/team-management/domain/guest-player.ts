import { newGuestPlayerId, type GuestPlayerId } from "./guest-player-id";
import type { TeamId } from "./team-id";

const MAX_NAME_LENGTH = 50;

/**
 * 助っ人選手エンティティ。
 *
 * Member より軽量なエンティティ:
 *   - 名前と所属チームだけ。権限・写真などは持たない
 *   - 登録は試合の打順登録画面から行う想定（運用上）
 *
 * 注: DBスキーマ上 guest_players は game_id を持たないチーム単位のプール。
 *     一度登録すると同チームの別試合でも再利用可能。
 *     リピートして使う助っ人は最終的に Member 化する運用（Phase 1 要件）。
 */
export class GuestPlayer {
  private constructor(
    readonly id: GuestPlayerId,
    readonly teamId: TeamId,
    readonly name: string,
  ) {
    if (name.trim() === "") {
      throw new Error("助っ人選手名は必須です");
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(
        `助っ人選手名は${MAX_NAME_LENGTH}文字以内で入力してください`,
      );
    }
  }

  static register(params: { teamId: TeamId; name: string }): GuestPlayer {
    return new GuestPlayer(newGuestPlayerId(), params.teamId, params.name.trim());
  }

  static restore(params: {
    id: GuestPlayerId;
    teamId: TeamId;
    name: string;
  }): GuestPlayer {
    return new GuestPlayer(params.id, params.teamId, params.name);
  }
}
