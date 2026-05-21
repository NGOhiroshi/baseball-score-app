/**
 * UUID を「単なる文字列」ではなく型として区別するための Brand 型。
 *
 * DDDの値オブジェクト「ID」の TypeScript における素朴な表現。
 * 例えば `TeamId` と `MemberId` を取り違えるバグをコンパイル時に防げる。
 *
 * 使い方:
 *   export type TeamId = Brand<string, "TeamId">;
 *   const id = "abc" as TeamId;  // 明示キャストが必要
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** ランダムな UUID v4 を生成する（Node.js / ブラウザ両対応） */
export function generateId(): string {
  return crypto.randomUUID();
}
