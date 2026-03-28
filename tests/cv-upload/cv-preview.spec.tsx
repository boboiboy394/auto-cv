import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CVPreview } from "@/app/(app)/cv/_components/cv-preview";
import type { CVUploadResponse } from "@/lib/types";

const fullCV: CVUploadResponse = {
  id: "cv-123",
  originalName: "resume.pdf",
  storagePath: "cvs/user1/cv-123/resume.pdf",
  parsedText: "Nguyễn Văn A\nEmail: nguyen@email.com",
  structuredData: {
    personalInfo: {
      name: "Nguyễn Văn A",
      email: "nguyen@email.com",
      phone: "0912345678",
      location: "Hồ Chí Minh",
      linkedIn: "https://linkedin.com/in/nguyen-van-a",
      portfolio: "https://nguyenvana.dev",
    },
    summary: "Senior Frontend Developer với 5 năm kinh nghiệm",
    experience: [
      {
        company: "TechCorp",
        title: "Frontend Developer",
        startDate: "2021-01",
        endDate: "Present",
        bullets: ["Xây dựng React apps", "Giảm 40% thời gian load"],
      },
    ],
    education: [
      {
        institution: "UIT",
        degree: "Cử nhân",
        field: "Khoa học Máy tính",
        graduationYear: 2019,
      },
    ],
    skills: ["React", "TypeScript", "Node.js", "Tailwind"],
  },
  parseConfidence: 0.87,
  warnings: [],
};

describe("CVPreview", () => {
  it("shows CV filename in header", () => {
    render(<CVPreview cv={fullCV} />);
    expect(screen.getByText("resume.pdf")).toBeInTheDocument();
  });

  it("shows parsed name and email", () => {
    render(<CVPreview cv={fullCV} />);
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByText("nguyen@email.com")).toBeInTheDocument();
  });

  it("shows skill tags", () => {
    render(<CVPreview cv={fullCV} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("shows high confidence badge", () => {
    render(<CVPreview cv={fullCV} />);
    expect(screen.getByText(/độ chính xác cao/i)).toBeInTheDocument();
  });

  it("shows medium confidence badge for low confidence", () => {
    const mediumCV = { ...fullCV, parseConfidence: 0.6 };
    render(<CVPreview cv={mediumCV} />);
    expect(screen.getByText(/trung bình/i)).toBeInTheDocument();
  });

  it("shows low confidence badge", () => {
    const lowCV = { ...fullCV, parseConfidence: 0.3 };
    render(<CVPreview cv={lowCV} />);
    expect(screen.getByText(/thấp/i)).toBeInTheDocument();
  });

  it("shows warnings section when warnings present", () => {
    const warnCV = { ...fullCV, warnings: ["LOW_TEXT_EXTRACTION"] };
    render(<CVPreview cv={warnCV} />);
    expect(screen.getByText(/nội dung cv khó đọc/i)).toBeInTheDocument();
  });

  it("shows raw text fallback when structuredData is null", () => {
    const noParse: CVUploadResponse = {
      ...fullCV,
      structuredData: null,
      parseConfidence: null,
    };
    render(<CVPreview cv={noParse} />);
    expect(screen.getByText(/không thể phân tích tự động/i)).toBeInTheDocument();
    expect(screen.getByText(/nguyễn văn a/i)).toBeInTheDocument(); // from raw text
  });

  it("calls onContinue when continue button clicked", async () => {
    const onContinue = vi.fn();
    render(<CVPreview cv={fullCV} onContinue={onContinue} />);
    const btn = screen.getByRole("button", { name: /tiếp tục dán jd/i });
    btn.click();
    expect(onContinue).toHaveBeenCalled();
  });

  it("calls onUploadAnother when retry button clicked", async () => {
    const onUploadAnother = vi.fn();
    render(<CVPreview cv={fullCV} onUploadAnother={onUploadAnother} />);
    const btn = screen.getByRole("button", { name: /tải lên cv khác/i });
    btn.click();
    expect(onUploadAnother).toHaveBeenCalled();
  });
});
