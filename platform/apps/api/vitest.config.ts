import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 20000,
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // shared Postgres test DB — avoid cross-file interference
  },
});
