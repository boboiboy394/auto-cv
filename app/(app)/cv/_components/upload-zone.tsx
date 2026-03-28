"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { CVUploadResponse } from "@/lib/types";

type UploadState = "idle" | "uploading" | "success" | "error";

interface UploadZoneProps {
  onUploadComplete: (cvData: CVUploadResponse) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setState("uploading");
    setError(null);
    setFileName(file.name);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setProgress(30);
      const res = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data.error?.includes?.("INVALID_FILE_TYPE")
            ? "Chỉ hỗ trợ file PDF và DOCX."
            : data.error?.includes?.("FILE_TOO_LARGE")
            ? "File quá lớn. Tối đa 5MB."
            : "Tải lên thất bại. Vui lòng thử lại.";
        throw new Error(msg);
      }

      const cvData = (await res.json()) as CVUploadResponse;
      setProgress(100);
      setState("success");
      onUploadComplete(cvData);
    } catch (err: unknown) {
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleRetry = () => {
    setState("idle");
    setError(null);
    setProgress(0);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const progressLabel =
    progress < 30
      ? "Đang tải lên..."
      : progress < 80
      ? "Đang phân tích CV..."
      : "Hoàn tất...";

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileChange}
        data-testid="file-input"
      />

      {/* Idle / Drop zone */}
      {state === "idle" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <Upload className="mx-auto mb-4 w-10 h-10 text-gray-400" />
          <p className="text-base font-medium text-gray-700">
            Kéo thả CV của bạn vào đây, hoặc{" "}
            <span className="text-primary-600 underline">click để chọn file</span>
          </p>
          <p className="mt-2 text-sm text-gray-500">Hỗ trợ PDF, DOCX • Tối đa 5MB</p>
        </button>
      )}

      {/* Uploading */}
      {state === "uploading" && (
        <div className="border rounded-xl p-8 text-center bg-gray-50">
          <p className="font-medium text-gray-700 mb-3">{fileName}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{progressLabel}</p>
        </div>
      )}

      {/* Success */}
      {state === "success" && (
        <div className="border border-green-300 rounded-xl p-6 bg-green-50 flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-green-800 truncate">{fileName}</p>
            <p className="text-sm text-green-600">Tải lên thành công</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="text-sm text-green-700 underline hover:text-green-900 flex-shrink-0"
          >
            Tải lên file khác
          </button>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="border border-red-300 rounded-xl p-6 bg-red-50 flex items-start gap-4">
          <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="font-medium text-red-800">{error ?? "Đã xảy ra lỗi"}</p>
            </div>
            <p className="text-sm text-red-600 mt-0.5">Vui lòng thử lại</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="text-sm text-red-700 underline hover:text-red-900 flex-shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
