import type { TeamId } from "@/contexts/team-management/domain/team-id";
import type { Game } from "./game";
import type { GameId } from "./game-id";

/**
 * Game 集約のリポジトリ。
 *
 * 集約は「ロード／セーブの単位」。
 * save() は集約ルート（Game）を渡せば、内部の BattingOrderEntry まで
 * まとめて永続化する。これがDDDで「集約 = トランザクション境界」と呼ばれる所以。
 */
export interface GameRepository {
  /** 試合を保存（新規 / 更新どちらも対応） */
  save(game: Game): Promise<void>;

  /** チームの全試合を取得（試合日の降順、打順は含まない軽量版） */
  findAllByTeam(teamId: TeamId): Promise<Game[]>;

  /** ID で単一試合を取得（打順を含む完全版）。見つからなければ null */
  findById(id: GameId): Promise<Game | null>;
}
