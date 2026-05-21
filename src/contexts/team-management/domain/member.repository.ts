import type { Member } from "./member";
import type { MemberId } from "./member-id";
import type { TeamId } from "./team-id";

/**
 * メンバーリポジトリのインターフェース（ドメイン層に定義）。
 *
 * DDDのキーポイント（依存性逆転）:
 *   - 「ドメインが必要とする操作」をここで定義する
 *   - 実装は infrastructure 層が担当する（Supabase, インメモリ, etc.）
 *   - アプリケーション層はこの**インターフェースだけ**に依存し、実装の選択は外から注入する
 *
 * これにより、Supabase を別の DB に差し替えてもドメイン・ユースケースは無変更で済む。
 * 単体テスト時にもインメモリ実装を注入して高速にテストできる。
 */
export interface MemberRepository {
  /** メンバーを保存（新規 / 更新どちらも upsert で対応） */
  save(member: Member): Promise<void>;

  /** チームに所属する全メンバーを取得（登録順） */
  findAllByTeam(teamId: TeamId): Promise<Member[]>;

  /** ID で単一メンバーを取得。見つからなければ null */
  findById(id: MemberId): Promise<Member | null>;
}
