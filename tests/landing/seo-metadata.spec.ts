/**
 * RED Phase — SEO and metadata tests.
 * Tests: tests/landing/seo-metadata.spec.ts
 */

describe("Sitemap", () => {
  it("sitemap exports default sitemap function", async () => {
    const sitemapFn = (await import("@/app/sitemap")).default;
    expect(typeof sitemapFn).toBe("function");
  });
});

describe("Robots", () => {
  it("robots exports default robots function", async () => {
    const robotsFn = (await import("@/app/robots")).default;
    expect(typeof robotsFn).toBe("function");
  });
});
