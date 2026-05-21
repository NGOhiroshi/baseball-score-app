/**
 * 成功/失敗を表す Result 型。
 *
 * 例外を throw する代わりに Result を返すことで、
 * - 失敗の可能性を型シグネチャに残せる
 * - 呼び出し側が必ず失敗ケースを意識せざるを得なくなる
 *
 * DDD ではドメイン例外（ビジネスルール違反）を「エラー値」として返すのが筋がよい。
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
