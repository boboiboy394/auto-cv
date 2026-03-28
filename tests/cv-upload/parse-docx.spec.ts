import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractTextFromDOCX } from "@/lib/cv-parser";

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

describe("extractTextFromDOCX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts text from a valid DOCX buffer", async () => {
    const mammoth = (await import("mammoth")).default;
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: "Nguyễn Văn A\nEmail: nguyen@email.com\nSkills: React, TypeScript",
    });

    const buffer = Buffer.from("fake docx content");
    const result = await extractTextFromDOCX(buffer);

    expect(result.text).toContain("Nguyễn Văn A");
    expect(result.isEmpty).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it("flags LOW_TEXT_EXTRACTION for large files with < 100 chars", async () => {
    const mammoth = (await import("mammoth")).default;
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: "Short text",
    });

    const bigBuffer = Buffer.alloc(60 * 1024);
    const result = await extractTextFromDOCX(bigBuffer);

    expect(result.isEmpty).toBe(true);
    expect(result.warnings).toContain("LOW_TEXT_EXTRACTION");
  });

  it("handles empty DOCX gracefully", async () => {
    const mammoth = (await import("mammoth")).default;
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: "",
    });

    const buffer = Buffer.from("content");
    const result = await extractTextFromDOCX(buffer);

    expect(result.text).toBe("");
    expect(result.warnings).toHaveLength(0);
  });
});
