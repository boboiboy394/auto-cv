/**
 * RED Phase — CV API tests
 *
 * Tests require running dev server: pnpm dev
 * Run: pnpm vitest run --config api-tests/vitest.api.config.ts
 *
 * Auth bypass: x-test-user-id header (dev/test only)
 */
import { api } from "../helpers/api-client";
import { authHeaders, TEST_USER_ID } from "../helpers/auth";
import cvData from "../seed/cv.json";

describe("POST /api/cv", () => {
  it("creates a CV record for authenticated user", async () => {
    const { status, body } = await api.post(
      "/cv",
      { originalName: cvData.validCV.originalName },
      authHeaders()
    );

    expect(status).toBe(201);
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("original_name", cvData.validCV.originalName);
  });

  it("rejects unauthenticated request with 401", async () => {
    const { status } = await api.post("/cv", {
      originalName: "test.pdf",
    });
    expect(status).toBe(401);
  });

  it("rejects missing originalName with 400", async () => {
    const { status, body } = await api.post(
      "/cv",
      {},
      authHeaders()
    );
    expect(status).toBe(400);
    expect(body).toHaveProperty("error");
  });
});

describe("GET /api/cv", () => {
  it("returns CV list for authenticated user", async () => {
    const { status, body } = await api.get(
      "/cv",
      authHeaders()
    );
    expect(status).toBe(200);
    expect(body).toBeInstanceOf(Array);
  });

  it("rejects unauthenticated request with 401", async () => {
    const { status } = await api.get("/cv");
    expect(status).toBe(401);
  });
});
