import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractTextFromPDF } from "@/lib/cv-parser";

vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

describe("extractTextFromPDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts text from a valid PDF buffer", async () => {
    const { default: pdfParse } = await import("pdf-parse");
    vi.mocked(pdfParse).mockResolvedValue({
      text: "Nguyễn Văn A\nEmail: nguyen@email.com\nSkills: React, TypeScript",
      metadata: { numberOfPages: 1 },
    });

    const buffer = Buffer.from("fake pdf content");
    const result = await extractTextFromPDF(buffer);

    expect(result.text).toContain("Nguyễn Văn A");
    expect(result.pageCount).toBe(1);
    expect(result.isEmpty).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it("flags LOW_TEXT_EXTRACTION for large files with < 100 chars of text", async () => {
    const { default: pdfParse } = await import("pdf-parse");
    // Simulate a 100KB+ file that returns very little text (likely scanned/image PDF)
    vi.mocked(pdfParse).mockResolvedValue({
      text: "Short",
      metadata: { numberOfPages: 1 },
    });

    // Create a buffer > 50KB
    const bigBuffer = Buffer.alloc(60 * 1024);
    const result = await extractTextFromPDF(bigBuffer);

    expect(result.isEmpty).toBe(true);
    expect(result.warnings).toContain("LOW_TEXT_EXTRACTION");
  });

  it("does not flag SMALL files with < 100 chars as empty", async () => {
    const { default: pdfParse } = await import("pdf-parse");
    vi.mocked(pdfParse).mockResolvedValue({
      text: "Short CV text",
      metadata: { numberOfPages: 1 },
    });

    const smallBuffer = Buffer.from("tiny");
    const result = await extractTextFromPDF(smallBuffer);

    expect(result.isEmpty).toBe(false);
    expect(result.warnings).not.toContain("LOW_TEXT_EXTRACTION");
  });

  it("handles PDF with no extracted text", async () => {
    const { default: pdfParse } = await import("pdf-parse");
    vi.mocked(pdfParse).mockResolvedValue({
      text: "",
      metadata: { numberOfPages: 1 },
    });

    const buffer = Buffer.from("some content");
    const result = await extractTextFromPDF(buffer);

    expect(result.text).toBe("");
    expect(result.warnings).toHaveLength(0);
  });
});
