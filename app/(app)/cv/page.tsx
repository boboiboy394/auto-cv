"use client";

import { useState } from "react";
import { UploadZone } from "./_components/upload-zone";
import { CVPreview } from "./_components/cv-preview";
import type { CVUploadResponse } from "@/lib/types";

export default function CVUploadPage() {
  const [uploadedCV, setUploadedCV] = useState<CVUploadResponse | null>(null);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tải lên CV của bạn</h1>
          <p className="mt-2 text-gray-600">
            Upload CV (PDF hoặc DOCX) để bắt đầu. Hệ thống sẽ phân tích và customize CV
            theo JD.
          </p>
        </div>

        {!uploadedCV ? (
          <UploadZone onUploadComplete={(cv) => setUploadedCV(cv)} />
        ) : (
          <div className="space-y-6">
            <CVPreview
              cv={uploadedCV}
              onContinue={() => {
                // Navigate to JD paste page
                window.location.href = "/jobs/new";
              }}
              onUploadAnother={() => setUploadedCV(null)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
