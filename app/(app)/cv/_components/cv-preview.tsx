"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import type { CVUploadResponse, ParsedCVData } from "@/lib/types";

interface CVPreviewProps {
  cv: CVUploadResponse;
  onContinue?: () => void;
  onUploadAnother?: () => void;
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
        <AlertCircle className="w-4 h-4" />
        Chưa phân tích
      </span>
    );
  }
  if (confidence >= 0.8) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
        <CheckCircle className="w-4 h-4" />
        Độ chính xác cao
      </span>
    );
  }
  if (confidence >= 0.5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">
        <AlertTriangle className="w-4 h-4" />
        Độ chính xác trung bình — vui lòng kiểm tra lại
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
      <AlertCircle className="w-4 h-4" />
      Độ chính xác thấp — bạn có thể chỉnh sửa thủ công
    </span>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-gray-800">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {open && <div className="px-4 py-3 space-y-1">{children}</div>}
    </div>
  );
}

const WARNING_LABELS: Record<string, string> = {
  LOW_TEXT_EXTRACTION: "Nội dung CV khó đọc tự động — hãy thử file khác",
  PARSE_TIMEOUT: "Phân tích mất lâu hơn bình thường",
  PARSE_FAILED: "Không thể phân tích tự động — hiển thị nội dung gốc",
  EMPTY_TEXT: "Không tìm thấy nội dung trong file",
  AI_PARSE_SKIPPED: "Phân tích AI bị bỏ qua (thiếu API key)",
};

export function CVPreview({ cv, onContinue, onUploadAnother }: CVPreviewProps) {
  const { structuredData, parsedText, parseConfidence, warnings } = cv;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">CV của bạn</h2>
          <p className="text-sm text-gray-500 mt-0.5">{cv.originalName}</p>
        </div>
        <ConfidenceBadge confidence={parseConfidence} />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <p className="font-medium mb-1">Một số vấn đề khi phân tích:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((w) => (
              <li key={w}>{WARNING_LABELS[w] ?? w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured data */}
      {structuredData ? (
        <div className="space-y-3">
          {/* Personal Info */}
          <Section title="Thông tin cá nhân">
            <p className="font-semibold text-gray-900">
              {structuredData.personalInfo.name || "—"}
            </p>
            <p className="text-sm text-gray-600">
              {structuredData.personalInfo.email || "—"}
            </p>
            {structuredData.personalInfo.phone && (
              <p className="text-sm text-gray-600">{structuredData.personalInfo.phone}</p>
            )}
            {structuredData.personalInfo.location && (
              <p className="text-sm text-gray-600">{structuredData.personalInfo.location}</p>
            )}
            {structuredData.personalInfo.linkedIn && (
              <a
                href={structuredData.personalInfo.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 underline"
              >
                LinkedIn
              </a>
            )}
            {structuredData.personalInfo.portfolio && (
              <a
                href={structuredData.personalInfo.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 underline ml-2"
              >
                Portfolio
              </a>
            )}
          </Section>

          {/* Summary */}
          {structuredData.summary && (
            <Section title="Tóm tắt">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {structuredData.summary}
              </p>
            </Section>
          )}

          {/* Skills */}
          {structuredData.skills?.length > 0 && (
            <Section title="Kỹ năng">
              <div className="flex flex-wrap gap-2">
                {structuredData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 bg-primary-100 text-primary-700 text-sm rounded-full font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Experience */}
          {structuredData.experience?.length > 0 && (
            <Section title="Kinh nghiệm làm việc">
              {structuredData.experience.map((exp, i) => (
                <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-gray-900">{exp.title || "—"}</p>
                  <p className="text-sm text-gray-600">
                    {exp.company}
                    {exp.startDate && ` • ${exp.startDate}`}
                    {exp.endDate && ` – ${exp.endDate}`}
                  </p>
                  {exp.bullets?.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {exp.bullets.map((b, j) => (
                        <li key={j} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-gray-400 shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Education */}
          {structuredData.education?.length > 0 && (
            <Section title="Học vấn">
              {structuredData.education.map((edu, i) => (
                <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-gray-900">
                    {edu.degree}
                    {edu.field ? ` — ${edu.field}` : ""}
                  </p>
                  <p className="text-sm text-gray-600">
                    {edu.institution}
                    {edu.graduationYear ? ` • ${edu.graduationYear}` : ""}
                  </p>
                </div>
              ))}
            </Section>
          )}
        </div>
      ) : (
        /* Fallback: raw text */
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">
            Không thể phân tích tự động. Nội dung gốc:
          </p>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
            {parsedText || "Không có nội dung"}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Tiếp tục dán JD
          </button>
        )}
        {onUploadAnother && (
          <button
            type="button"
            onClick={onUploadAnother}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Tải lên CV khác
          </button>
        )}
      </div>
    </div>
  );
}
