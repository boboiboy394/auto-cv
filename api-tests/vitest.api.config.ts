import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 10_000,
    include: ["api-tests/tests/**/*.test.ts"],
    // Allow tests to run without a running server in CI
    // (skip mode when BASE_URL not set)
    passWithNoTests: false,
  },
});
