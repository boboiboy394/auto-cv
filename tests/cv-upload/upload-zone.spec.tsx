import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadZone } from "@/app/(app)/cv/_components/upload-zone";
import type { CVUploadResponse } from "@/lib/types";

const mockCV: CVUploadResponse = {
  id: "cv-123",
  originalName: "resume.pdf",
  storagePath: "cvs/user1/cv-123/resume.pdf",
  parsedText: "Nguyễn Văn A",
  structuredData: null,
  parseConfidence: null,
  warnings: [],
};

describe("UploadZone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders idle state with drop hint text", () => {
    render(<UploadZone onUploadComplete={vi.fn()} />);
    expect(
      screen.getByText(/kéo thả.*cv.*của bạn/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/hỗ trợ pdf, docx/i)).toBeInTheDocument();
  });

  it("calls onUploadComplete when upload succeeds", async () => {
    const onComplete = vi.fn();

    // Mock fetch success
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCV),
    }) as unknown as typeof fetch;

    render(<UploadZone onUploadComplete={onComplete} />);

    const file = new File(["fake content"], "resume.pdf", {
      type: "application/pdf",
    });

    const input = screen.getByTestId("file-input");
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(mockCV);
    });
  });

  it("shows error state when upload fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "FILE_TOO_LARGE: Maximum file size is 5MB" }),
    }) as unknown as typeof fetch;

    render(<UploadZone onUploadComplete={vi.fn()} />);

    const file = new File(["x".repeat(1024)], "big.pdf", {
      type: "application/pdf",
    });

    const input = screen.getByTestId("file-input");
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/file quá lớn/i)).toBeInTheDocument();
    });
  });

  it("shows generic error on non-parseable error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    render(<UploadZone onUploadComplete={vi.fn()} />);

    const file = new File(["content"], "resume.pdf", {
      type: "application/pdf",
    });

    const input = screen.getByTestId("file-input");
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/tải lên thất bại/i)).toBeInTheDocument();
    });
  });

  it("retry resets state to idle", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "SERVER_ERROR" }),
    }) as unknown as typeof fetch;

    render(<UploadZone onUploadComplete={vi.fn()} />);

    const file = new File(["content"], "resume.pdf", {
      type: "application/pdf",
    });

    const input = screen.getByTestId("file-input");
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/tải lên thất bại/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Thử lại");
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/kéo thả.*cv.*của bạn/i)).toBeInTheDocument();
    });
  });
});
