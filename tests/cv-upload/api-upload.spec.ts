import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateFileMimeType,
  validateFileSize,
  MAX_FILE_SIZE,
} from "@/app/api/cv/upload/route";

vi.mock("@/lib/auth", () => ({
  getServerUserId: vi.fn(),
}));

describe("POST /api/cv/upload — validation functions", () => {
  describe("validateFileMimeType", () => {
    it("accepts application/pdf", () => {
      expect(validateFileMimeType("application/pdf")).toBeNull();
    });

    it("accepts application/vnd.openxmlformats-officedocument.wordprocessingml.document", () => {
      const docx =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      expect(validateFileMimeType(docx)).toBeNull();
    });

    it("rejects image/png", () => {
      const result = validateFileMimeType("image/png");
      expect(result).not.toBeNull();
      expect(result).toContain("INVALID_FILE_TYPE");
    });

    it("rejects image/jpeg", () => {
      const result = validateFileMimeType("image/jpeg");
      expect(result).not.toBeNull();
      expect(result).toContain("INVALID_FILE_TYPE");
    });

    it("rejects empty string", () => {
      expect(validateFileMimeType("")).not.toBeNull();
    });
  });

  describe("validateFileSize", () => {
    it("accepts file under 5MB", () => {
      const result = validateFileSize(3 * 1024 * 1024); // 3MB
      expect(result).toBeNull();
    });

    it("accepts file exactly at 5MB", () => {
      const result = validateFileSize(MAX_FILE_SIZE);
      expect(result).toBeNull();
    });

    it("rejects file over 5MB", () => {
      const result = validateFileSize(MAX_FILE_SIZE + 1);
      expect(result).not.toBeNull();
      expect(result).toContain("FILE_TOO_LARGE");
    });

    it("rejects file significantly over 5MB", () => {
      const result = validateFileSize(6 * 1024 * 1024); // 6MB
      expect(result).not.toBeNull();
      expect(result).toContain("FILE_TOO_LARGE");
    });

    it("accepts empty file (0 bytes)", () => {
      expect(validateFileSize(0)).toBeNull();
    });
  });
});

describe("POST /api/cv/upload — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { getServerUserId } = await import("@/lib/auth");
    vi.mocked(getServerUserId).mockResolvedValue(null);

    const { POST } = await import("@/app/api/cv/upload/route");
    const req = new Request("http://localhost/api/cv/upload", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file provided", async () => {
    const { getServerUserId } = await import("@/lib/auth");
    vi.mocked(getServerUserId).mockResolvedValue("user_123");

    const { POST } = await import("@/app/api/cv/upload/route");
    const req = new Request("http://localhost/api/cv/upload", {
      method: "POST",
      body: new FormData(), // empty form data
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No file provided");
  });
});
