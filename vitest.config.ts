import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // ドメイン層は純粋な TS なので node 環境で十分（jsdom 不要）
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
