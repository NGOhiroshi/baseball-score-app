import type { TeamId } from "./team-id";
import type { TeamSettings } from "./team-settings";

/**
 * チーム設定リポジトリ（ドメイン層のインターフェース）。
 */
export interface TeamSettingsRepository {
  /** チーム設定を取得（未設定なら既定値を返す） */
  get(teamId: TeamId): Promise<TeamSettings>;

  /** チーム設定を保存 */
  save(teamId: TeamId, settings: TeamSettings): Promise<void>;
}
