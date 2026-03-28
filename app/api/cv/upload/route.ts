import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { uploadCVFile } from "@/lib/supabase/storage";
import { parseCVFile } from "@/lib/cv-parser";
import type { CVUploadResponse } from "@/lib/types";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — exported for testing

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Validate a file's MIME type. Returns error string or null if valid. */
export function validateFileMimeType(mimeType: string): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return "INVALID_FILE_TYPE: Only PDF and DOCX are allowed";
  }
  return null;
}

/** Validate a file's size. Returns error string or null if valid. */
export function validateFileSize(sizeBytes: number): string | null {
  if (sizeBytes > MAX_FILE_SIZE) {
    return "FILE_TOO_LARGE: Maximum file size is 5MB";
  }
  return null;
}

export async function POST(req: Request) {
  // --- Auth ---
  const userId = await getServerUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse FormData ---
  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "INVALID_FORM_DATA" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // --- Validate file type ---
  const mimeType = file.type;
  const mimeError = validateFileMimeType(mimeType);
  if (mimeError) {
    return NextResponse.json({ error: mimeError }, { status: 400 });
  }

  // --- Validate file size ---
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sizeError = validateFileSize(buffer.length);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 400 });
  }

  // --- Sanitize filename ---
  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  // --- Generate CV ID ---
  const cvId = crypto.randomUUID();

  // --- Upload to Supabase Storage ---
  let storagePath = "";
  try {
    const result = await uploadCVFile(userId, cvId, fileName, buffer, mimeType);
    storagePath = result.storagePath;
  } catch (err) {
    console.error("Storage upload failed:", err);
    return NextResponse.json({ error: "STORAGE_UPLOAD_FAILED" }, { status: 500 });
  }

  // --- Parse CV (sync) ---
  const parseResult = await parseCVFile(buffer, mimeType);

  // --- Insert DB record ---
  const supabase = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cvRecord, error: dbError } = await (supabase.from("cvs") as any)
    .insert({
      user_id: userId,
      original_name: fileName,
      storage_path: storagePath,
      parsed_text: parseResult.text || null,
      structured_data: parseResult.structuredData ?? null,
      parse_confidence: parseResult.confidence ?? null,
      warnings: parseResult.warnings,
    })
    .select()
    .single();

  if (dbError) {
    console.error("DB insert failed:", dbError);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }

  // --- Return response ---
  const response: CVUploadResponse = {
    id: cvRecord.id,
    originalName: cvRecord.original_name,
    storagePath: cvRecord.storage_path,
    parsedText: cvRecord.parsed_text,
    structuredData: cvRecord.structured_data as CVUploadResponse["structuredData"],
    parseConfidence: cvRecord.parse_confidence,
    warnings: (cvRecord.warnings as string[]) ?? [],
  };

  return NextResponse.json(response, { status: 201 });
}
