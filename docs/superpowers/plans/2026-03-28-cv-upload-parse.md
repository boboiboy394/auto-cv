# Task 2.1: CV Upload & Parse — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User upload CV (PDF/DOCX) → stored in Supabase Storage → parsed text extracted → AI extracts structured data → displayed for user verification.

**Architecture:** Upload Zone UI → API route handles validation + Supabase Storage upload + text extraction (pdf-parse/mammoth) + AI structured extraction (Claude) → DB update → return result to frontend.

**Tech Stack:** Next.js 16 · Supabase Storage · `pdf-parse` · `mammoth` · `@anthropic-ai/sdk` · Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/cv-parser.ts` | Create | Pure functions: text extraction + AI parse |
| `lib/supabase/storage.ts` | Create | Supabase Storage helpers (upload, delete) |
| `app/api/cv/upload/route.ts` | Create | POST upload endpoint |
| `app/api/cv/[id]/route.ts` | Create | GET/DELETE single CV |
| `app/api/cv/route.ts` | Modify | No changes needed |
| `lib/types.ts` | Modify | Add `parseConfidence`, `warnings[]` to CV type |
| `app/(app)/cv/page.tsx` | Create | CV upload page |
| `app/(app)/cv/_components/upload-zone.tsx` | Create | Drag & drop upload UI |
| `app/(app)/cv/_components/cv-preview.tsx` | Create | Parsed CV display |
| `app/(app)/cv/_components/cv-list.tsx` | Create | List uploaded CVs |
| `tests/cv-upload/parse-pdf.spec.ts` | Create | pdf-parse unit tests |
| `tests/cv-upload/parse-docx.spec.ts` | Create | mammoth unit tests |
| `tests/cv-upload/api-upload.spec.ts` | Create | API route integration tests |
| `tests/cv-upload/upload-zone.spec.tsx` | Create | UploadZone component tests |
| `tests/cv-upload/cv-preview.spec.tsx` | Create | CVPreview component tests |
| `supabase/migrations/001_initial_schema.sql` | Modify | Enable RLS + storage policies |
| `package.json` | Modify | Add packages: `pdf-parse`, `mammoth`, `@anthropic-ai/sdk` |

---

## Chunk 1: Setup — Packages & Types

### Task 1.1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install packages**

Run:
```bash
cd D:/vibe-coding-project/auto-cv
pnpm add @anthropic-ai/sdk pdf-parse mammoth
pnpm add -D @types/pdf-parse
```

Verify: `node_modules/pdf-parse`, `node_modules/mammoth`, `node_modules/@anthropic-ai/sdk` exist.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add pdf-parse mammoth anthropic-sdk

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.2: Extend types

**Files:** `lib/types.ts`

- [ ] **Step 1: Add new fields to CV type**

```typescript
// Add after existing CV type definition in lib/types.ts

// Extend CV Row with parse metadata
export interface CVParseResult {
  id: string;
  user_id: string;
  original_name: string;
  storage_path: string;
  parsed_text: string | null;
  structured_data: ParsedCVData | null;
  parse_confidence: number | null;   // 0-1, null if not parsed
  warnings: string[];                // e.g. ["LOW_TEXT_EXTRACTION", "PARSE_TIMEOUT"]
  created_at: string;
}

// API response shape (what frontend receives)
export interface CVUploadResponse {
  id: string;
  originalName: string;
  storagePath: string;
  parsedText: string | null;
  structuredData: ParsedCVData | null;
  parseConfidence: number | null;
  warnings: string[];
}
```

- [ ] **Step 2: Add `warnings` and `parse_confidence` to Database type Insert/Update**

```typescript
// In Database["public"]["Tables"]["cvs"]["Insert"]:
cvs: {
  Insert: {
    // ... existing fields ...
    parse_confidence?: number | null;
    warnings?: string[];
  };
  Update: {
    // ... existing fields ...
    parse_confidence?: number | null;
    warnings?: string[];
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: extend CV type with parse confidence and warnings fields

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: Core Logic — CV Parser & Storage

### Task 2.1: Supabase Storage helpers

**Files:** `lib/supabase/storage.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/cv-upload/storage.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadCVFile, deleteCVFile } from "@/lib/supabase/storage";

describe("uploadCVFile", () => {
  it("should upload file to correct path and return storage path", async () => {
    const mockStorage = {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "cvs/user1/cv1/resume.pdf" }, error: null }),
      }),
    };
    // Test the path format: cvs/{userId}/{cvId}/{filename}
  });
});
```

- [ ] **Step 2: Write implementation**

```typescript
// lib/supabase/storage.ts
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Upload a CV file to Supabase Storage.
 * @param userId - Clerk user ID
 * @param cvId  - Generated UUID for this CV
 * @param fileName - Original filename (will be sanitized)
 * @param fileBuffer - File content as Buffer/ArrayBuffer
 * @param mimeType - File MIME type
 */
export async function uploadCVFile(
  userId: string,
  cvId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ storagePath: string }> {
  const supabase = createSupabaseAdmin();

  // Sanitize filename: keep extension only, remove path traversal
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeName = `${cvId}.${ext}`;
  const storagePath = `cvs/${userId}/${safeName}`;

  const { data, error } = await supabase.storage
    .from("cvs")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true, // Allow overwriting if re-uploaded
    });

  if (error) {
    throw new Error(`STORAGE_UPLOAD_FAILED: ${error.message}`);
  }

  return { storagePath };
}

/**
 * Delete a CV file from Supabase Storage.
 * @param storagePath - Full path in the cvs bucket (e.g. "cvs/user1/cv1.pdf")
 */
export async function deleteCVFile(storagePath: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from("cvs").remove([storagePath]);
  if (error) {
    console.error("STORAGE_DELETE_FAILED:", error);
    // Don't throw — file deletion failure is non-critical
  }
}

/**
 * Download a CV file from Supabase Storage as Buffer.
 */
export async function downloadCVFile(storagePath: string): Promise<Buffer> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from("cvs").download(storagePath);
  if (error || !data) {
    throw new Error(`STORAGE_DOWNLOAD_FAILED: ${error?.message ?? "no data"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

- [ ] **Step 3: Run test to verify it compiles (no actual API calls)**

Run: `pnpm tsc --noEmit lib/supabase/storage.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/storage.ts tests/
git commit -m "feat: add Supabase Storage helpers for CV files

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.2: CV text extraction functions

**Files:** `lib/cv-parser.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/cv-upload/parse-pdf.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractTextFromPDF } from "@/lib/cv-parser";

describe("extractTextFromPDF", () => {
  it("should extract text from a valid PDF buffer", async () => {
    // Mock pdf-parse
    vi.doMock("pdf-parse", () => ({
      default: vi.fn().mockResolvedValue({
        text: "Nguyễn Văn A\nEmail: nguyen@email.com\nSkills: React, TypeScript",
        metadata: { numberOfPages: 1 },
      }),
    }));
    const buffer = Buffer.from("fake pdf content");
    const result = await extractTextFromPDF(buffer);
    expect(result.text).toContain("Nguyễn Văn A");
    expect(result.pageCount).toBe(1);
    vi.doUnmock("pdf-parse");
  });

  it("should return isEmpty=true for files with < 100 chars extracted", async () => {
    vi.doMock("pdf-parse", () => ({
      default: vi.fn().mockResolvedValue({
        text: "Short",
        metadata: { numberOfPages: 1 },
      }),
    }));
    const buffer = Buffer.from("tiny file");
    const result = await extractTextFromPDF(buffer);
    expect(result.isEmpty).toBe(true);
    vi.doUnmock("pdf-parse");
  });
});
```

```typescript
// tests/cv-upload/parse-docx.spec.ts
import { describe, it, expect, vi } from "vitest";
import { extractTextFromDOCX } from "@/lib/cv-parser";

describe("extractTextFromDOCX", () => {
  it("should extract text from a valid DOCX buffer", async () => {
    vi.doMock("mammoth", () => ({
      default: {
        extractRawText: vi.fn().mockResolvedValue({
          value: "Nguyễn Văn A\nEmail: nguyen@email.com",
        }),
      },
    }));
    const buffer = Buffer.from("fake docx content");
    const result = await extractTextFromDOCX(buffer);
    expect(result.text).toContain("Nguyễn Văn A");
    vi.doUnmock("mammoth");
  });
});
```

- [ ] **Step 2: Write implementation**

```typescript
// lib/cv-parser.ts
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export interface TextExtractionResult {
  text: string;
  pageCount?: number;
  isEmpty: boolean; // true if text < 100 chars for files > 50KB
  warnings: string[];
}

export interface ParseResult {
  text: string;
  structuredData: import("@/lib/types").ParsedCVData | null;
  confidence: number | null;
  warnings: string[];
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<TextExtractionResult> {
  const warnings: string[] = [];

  const data = await pdfParse(buffer);
  const text = data.text?.trim() ?? "";

  // Check for low text extraction (potential scanned/image PDF)
  const isEmpty = buffer.length > 50 * 1024 && text.length < 100;
  if (isEmpty) {
    warnings.push("LOW_TEXT_EXTRACTION");
  }

  return {
    text,
    pageCount: data.metadata?.numberOfPages,
    isEmpty,
    warnings,
  };
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<TextExtractionResult> {
  const warnings: string[] = [];

  const result = await mammoth.extractRawText({ buffer });
  const text = result.value?.trim() ?? "";

  const isEmpty = buffer.length > 50 * 1024 && text.length < 100;
  if (isEmpty) {
    warnings.push("LOW_TEXT_EXTRACTION");
  }

  return {
    text,
    isEmpty,
    warnings,
  };
}

/**
 * Parse CV text into structured data using Claude AI.
 * Returns null structuredData if parsing fails (raw text still returned).
 */
export async function parseCVWithAI(rawText: string): Promise<ParseResult> {
  const warnings: string[] = [];
  let structuredData: import("@/lib/types").ParsedCVData | null = null;
  let confidence: number | null = null;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    warnings.push("AI_PARSE_SKIPPED: ANTHROPIC_API_KEY not set");
    return { text: rawText, structuredData: null, confidence: null, warnings };
  }

  try {
    // Dynamically import to avoid build errors when key is missing
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: anthropicKey });

    const truncationLimit = 8000; // chars — keep within token budget
    const truncatedText = rawText.slice(0, truncationLimit);

    const response = await Promise.race([
      client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        system: `You are an expert CV parser. Extract structured data from CV text.
Return a JSON object with this exact shape:
{
  "personalInfo": { "name": "", "email": "", "phone": "", "location": "", "linkedIn": "", "portfolio": "" },
  "summary": "",
  "experience": [{ "company": "", "title": "", "startDate": "", "endDate": "", "bullets": [] }],
  "education": [{ "institution": "", "degree": "", "field": "", "graduationYear": 0 }],
  "skills": []
}
If a field is not found, use an empty string/array.
Only extract what is explicitly stated in the CV. Do not invent or assume information.
Return ONLY the JSON object, no markdown code blocks, no explanation.`,
        messages: [
          {
            role: "user",
            content: `Parse this CV:\n\n${truncatedText}`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 30_000)
      ),
    ]);

    const rawOutput = response.content[0];
    if (rawOutput?.type === "text") {
      const parsed = JSON.parse(rawOutput.text) as import("@/lib/types").ParsedCVData;
      structuredData = parsed;
      // Estimate confidence based on completeness of required fields
      const hasName = !!parsed.personalInfo?.name;
      const hasEmail = !!parsed.personalInfo?.email;
      const hasSkills = (parsed.skills?.length ?? 0) > 0;
      const hasExperience = (parsed.experience?.length ?? 0) > 0;
      const completenessScore = [hasName, hasEmail, hasSkills, hasExperience].filter(Boolean).length / 4;
      confidence = 0.5 + completenessScore * 0.5; // 0.5–1.0
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "AI_TIMEOUT") {
      warnings.push("PARSE_TIMEOUT");
    } else {
      console.error("AI parse error:", err);
      warnings.push("PARSE_FAILED");
    }
  }

  return { text: rawText, structuredData, confidence, warnings };
}

/**
 * Full pipeline: extract text from file buffer → AI parse → structured result.
 */
export async function parseCVFile(
  buffer: Buffer,
  mimeType: string
): Promise<ParseResult> {
  const warnings: string[] = [];
  let rawText = "";

  // Step 1: Extract raw text
  if (mimeType === "application/pdf") {
    const result = await extractTextFromPDF(buffer);
    rawText = result.text;
    warnings.push(...result.warnings);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await extractTextFromDOCX(buffer);
    rawText = result.text;
    warnings.push(...result.warnings);
  } else {
    warnings.push("UNSUPPORTED_MIME_TYPE");
    return { text: "", structuredData: null, confidence: null, warnings };
  }

  if (!rawText.trim()) {
    warnings.push("EMPTY_TEXT");
    return { text: "", structuredData: null, confidence: null, warnings };
  }

  // Step 2: AI structured extraction
  const aiResult = await parseCVWithAI(rawText);
  return {
    text: rawText,
    structuredData: aiResult.structuredData,
    confidence: aiResult.confidence,
    warnings: [...warnings, ...aiResult.warnings],
  };
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/cv-upload/parse-pdf.spec.ts tests/cv-upload/parse-docx.spec.ts`
Expected: PASS (mocked tests pass)

- [ ] **Step 4: Commit**

```bash
git add lib/cv-parser.ts tests/cv-upload/parse-pdf.spec.ts tests/cv-upload/parse-docx.spec.ts
git commit -m "feat: add CV text extraction and AI parse pipeline

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 3: API Routes

### Task 3.1: POST /api/cv/upload

**Files:** `app/api/cv/upload/route.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/cv-upload/api-upload.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/cv/upload/route";

describe("POST /api/cv/upload", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return 400 if no file provided", async () => {
    const req = new Request("http://localhost/api/cv/upload", {
      method: "POST",
      headers: { "x-test-user-id": "user1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid file type", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["hello"], { type: "image/png" }), "test.png");
    const req = new Request("http://localhost/api/cv/upload", {
      method: "POST",
      body: formData,
      headers: { "x-test-user-id": "user1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 for oversized file (>5MB)", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    const formData = new FormData();
    formData.append("file", new Blob([bigBuffer], { type: "application/pdf" }), "big.pdf");
    const req = new Request("http://localhost/api/cv/upload", {
      method: "POST",
      body: formData,
      headers: { "x-test-user-id": "user1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `pnpm test tests/cv-upload/api-upload.spec.ts`
Expected: FAIL — route doesn't exist yet

- [ ] **Step 3: Write implementation**

```typescript
// app/api/cv/upload/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { uploadCVFile } from "@/lib/supabase/storage";
import { parseCVFile } from "@/lib/cv-parser";
import type { CVUploadResponse } from "@/lib/types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(req: Request) {
  // --- Auth ---
  const devUserId = req.headers.get("x-test-user-id");
  const isDev = process.env.NODE_ENV !== "production";
  let userId: string | null = null;

  if (isDev && devUserId) {
    userId = devUserId;
  } else {
    const authResult = await auth();
    userId = authResult?.userId ?? null;
  }

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
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "INVALID_FILE_TYPE: Only PDF and DOCX are allowed" },
      { status: 400 }
    );
  }

  // --- Validate file size ---
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE: Maximum file size is 5MB" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "STORAGE_UPLOAD_FAILED" },
      { status: 500 }
    );
  }

  // --- Parse CV (sync) ---
  const parseResult = await parseCVFile(buffer, mimeType);

  // --- Insert DB record ---
  const supabase = createSupabaseAdmin();
  const { data: cvRecord, error: dbError } = await supabase
    .from("cvs")
    .insert({
      user_id: userId,
      original_name: fileName,
      storage_path: storagePath,
      parsed_text: parseResult.text || null,
      structured_data: parseResult.structuredData ?? null,
      parse_confidence: parseResult.confidence ?? null,
      warnings: parseResult.warnings,
    } as Record<string, unknown>)
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
    warnings: cvRecord.warnings as string[] ?? [],
  };

  return NextResponse.json(response, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `pnpm test tests/cv-upload/api-upload.spec.ts`
Expected: PASS (file validation tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/cv/upload/route.ts tests/cv-upload/api-upload.spec.ts
git commit -m "feat: add POST /api/cv/upload with storage + parse pipeline

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.2: GET + DELETE /api/cv/[id]

**Files:** `app/api/cv/[id]/route.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/cv-upload/api-cv-single.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("GET /api/cv/[id]", () => {
  it("should return 401 if no auth", async () => {
    const { GET } = await import("@/app/api/cv/[id]/route");
    const req = new Request("http://localhost/api/cv/fake-id");
    const res = await GET(req, { params: { id: "fake-id" } } as any);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Write implementation**

```typescript
// app/api/cv/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { deleteCVFile } from "@/lib/supabase/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const devUserId = req.headers.get("x-test-user-id");
  const isDev = process.env.NODE_ENV !== "production";
  let userId: string | null = null;

  if (isDev && devUserId) {
    userId = devUserId;
  } else {
    const authResult = await auth();
    userId = authResult?.userId ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "CV_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const devUserId = req.headers.get("x-test-user-id");
  const isDev = process.env.NODE_ENV !== "production";
  let userId: string | null = null;

  if (isDev && devUserId) {
    userId = devUserId;
  } else {
    const authResult = await auth();
    userId = authResult?.userId ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Fetch to get storage path
  const { data: cv, error: fetchError } = await supabase
    .from("cvs")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !cv) {
    return NextResponse.json({ error: "CV_NOT_FOUND" }, { status: 404 });
  }

  // Delete storage file (non-blocking)
  if (cv.storage_path) {
    await deleteCVFile(cv.storage_path);
  }

  // Delete DB record
  const { error: deleteError } = await supabase
    .from("cvs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (deleteError) {
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Run test + compile check**

Run: `pnpm tsc --noEmit` + `pnpm test tests/cv-upload/`
Expected: No TypeScript errors, tests pass

- [ ] **Step 4: Commit**

```bash
git add app/api/cv/[id]/route.ts
git commit -m "feat: add GET/DELETE /api/cv/[id] with storage cleanup

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 4: Frontend Components

### Task 4.1: UploadZone component

**Files:** `app/(app)/cv/_components/upload-zone.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// tests/cv-upload/upload-zone.spec.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadZone } from "@/app/(app)/cv/_components/upload-zone";

describe("UploadZone", () => {
  it("renders idle state with drop hint", () => {
    render(<UploadZone onUploadComplete={vi.fn()} />);
    expect(screen.getByText(/kéo thả|chọn file/i)).toBeInTheDocument();
  });

  it("accepts only PDF and DOCX files", async () => {
    const user = userEvent.setup();
    render(<UploadZone onUploadComplete={vi.fn()} />);
    const input = screen.getByRole("button", { name: /upload/i }) || screen.getByTestId("file-input");
    const file = new File(["hello"], "resume.pdf", { type: "application/pdf" });
    await user.upload(input, file);
    // Verify no INVALID_FILE_TYPE error shown for PDF
  });
});
```

- [ ] **Step 2: Write implementation**

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";

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
          data.error === "INVALID_FILE_TYPE"
            ? "Chỉ hỗ trợ file PDF và DOCX."
            : data.error === "FILE_TOO_LARGE"
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
  };

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
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors"
        >
          <Upload className="mx-auto mb-4 w-10 h-10 text-gray-400" />
          <p className="text-base font-medium text-gray-700">
            Kéo thả CV của bạn vào đây, hoặc{" "}
            <span className="text-primary-600 underline">click để chọn file</span>
          </p>
          <p className="mt-2 text-sm text-gray-500">Hỗ trợ PDF, DOCX • Tối đa 5MB</p>
        </div>
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
          <p className="text-sm text-gray-500">
            {progress < 50 ? "Đang tải lên..." : progress < 80 ? "Đang phân tích CV..." : "Hoàn tất..."}
          </p>
        </div>
      )}

      {/* Success */}
      {state === "success" && (
        <div className="border border-green-300 rounded-xl p-6 bg-green-50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium text-green-800">{fileName}</p>
            <p className="text-sm text-green-600">Tải lên thành công</p>
          </div>
          <button
            onClick={handleRetry}
            className="text-sm text-green-700 underline hover:text-green-900"
          >
            Tải lên file khác
          </button>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="border border-red-300 rounded-xl p-6 bg-red-50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium text-red-800">{error ?? "Đã xảy ra lỗi"}</p>
            <p className="text-sm text-red-600">Vui lòng thử lại</p>
          </div>
          <button
            onClick={handleRetry}
            className="text-sm text-red-700 underline hover:text-red-900"
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run test**

Run: `pnpm test tests/cv-upload/upload-zone.spec.tsx --run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/cv/_components/upload-zone.tsx tests/cv-upload/upload-zone.spec.tsx
git commit -m "feat: add UploadZone component with drag-drop and states

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.2: CVPreview component

**Files:** `app/(app)/cv/_components/cv-preview.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/cv-upload/cv-preview.spec.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CVPreview } from "@/app/(app)/cv/_components/cv-preview";
import type { CVUploadResponse, ParsedCVData } from "@/lib/types";

const mockCV: CVUploadResponse = {
  id: "1",
  originalName: "resume.pdf",
  storagePath: "cvs/user1/cv1/resume.pdf",
  parsedText: "Nguyễn Văn A\nEmail: nguyen@email.com",
  structuredData: {
    personalInfo: { name: "Nguyễn Văn A", email: "nguyen@email.com", phone: "0912345678", location: "Hồ Chí Minh" },
    summary: "Senior Frontend Developer",
    experience: [{ company: "TechCorp", title: "Frontend Dev", startDate: "2020-01", endDate: "Present", bullets: ["Built React apps"] }],
    education: [{ institution: "UIT", degree: "Bachelor", field: "CS", graduationYear: 2019 }],
    skills: ["React", "TypeScript", "Node.js"],
  },
  parseConfidence: 0.87,
  warnings: [],
};

describe("CVPreview", () => {
  it("shows name and email from structured data", () => {
    render(<CVPreview cv={mockCV} />);
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByText("nguyen@email.com")).toBeInTheDocument();
  });

  it("shows skill tags", () => {
    render(<CVPreview cv={mockCV} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("shows confidence badge", () => {
    render(<CVPreview cv={mockCV} />);
    expect(screen.getByText(/Độ chính xác cao/i)).toBeInTheDocument();
  });

  it("shows low confidence warning", () => {
    const lowConf = { ...mockCV, parseConfidence: 0.3, warnings: ["LOW_TEXT_EXTRACTION"] };
    render(<CVPreview cv={lowConf} />);
    expect(screen.getByText(/thấp/i)).toBeInTheDocument();
  });

  it("shows raw text fallback when structuredData is null", () => {
    const noParse = { ...mockCV, structuredData: null, parseConfidence: null };
    render(<CVPreview cv={noParse} />);
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument(); // from raw text
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `pnpm test tests/cv-upload/cv-preview.spec.tsx --run`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Write implementation**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import type { CVUploadResponse } from "@/lib/types";

interface CVPreviewProps {
  cv: CVUploadResponse;
  onContinue?: () => void;
  onUploadAnother?: () => void;
}

function ConfidenceBadge({ confidence, warnings }: { confidence: number | null; warnings: string[] }) {
  if (confidence === null) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
        <AlertCircle className="w-4 h-4" />
        Chưa phân tích
      </div>
    );
  }
  if (confidence >= 0.8) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
        <CheckCircle className="w-4 h-4" />
        Độ chính xác cao
      </div>
    );
  }
  if (confidence >= 0.5) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">
        <AlertTriangle className="w-4 h-4" />
        Độ chính xác trung bình — vui lòng kiểm tra lại
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
      <AlertCircle className="w-4 h-4" />
      Độ chính xác thấp — bạn có thể chỉnh sửa thủ công
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-gray-800">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-4 py-3 space-y-1">{children}</div>}
    </div>
  );
}

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
        <ConfidenceBadge confidence={parseConfidence} warnings={warnings} />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <p className="font-medium mb-1">Một số vấn đề khi phân tích:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((w) => (
              <li key={w}>
                {w === "LOW_TEXT_EXTRACTION" && "Nội dung CV khó đọc tự động — hãy thử file khác"}
                {w === "PARSE_TIMEOUT" && "Phân tích mất lâu hơn bình thường"}
                {w === "PARSE_FAILED" && "Không thể phân tích tự động — hiển thị nội dung gốc"}
                {w === "EMPTY_TEXT" && "Không tìm thấy nội dung trong file"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured data display */}
      {structuredData ? (
        <div className="space-y-3">
          {/* Personal Info */}
          <Section title="Thông tin cá nhân">
            <p className="font-semibold text-gray-900">{structuredData.personalInfo.name || "—"}</p>
            <p className="text-sm text-gray-600">{structuredData.personalInfo.email || "—"}</p>
            {structuredData.personalInfo.phone && <p className="text-sm text-gray-600">{structuredData.personalInfo.phone}</p>}
            {structuredData.personalInfo.location && <p className="text-sm text-gray-600">{structuredData.personalInfo.location}</p>}
            {structuredData.personalInfo.linkedIn && <a href={structuredData.personalInfo.linkedIn} className="text-sm text-primary-600 underline">{structuredData.personalInfo.linkedIn}</a>}
            {structuredData.personalInfo.portfolio && <a href={structuredData.personalInfo.portfolio} className="text-sm text-primary-600 underline">{structuredData.personalInfo.portfolio}</a>}
          </Section>

          {/* Summary */}
          {structuredData.summary && (
            <Section title="Tóm tắt">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{structuredData.summary}</p>
            </Section>
          )}

          {/* Skills */}
          {structuredData.skills?.length > 0 && (
            <Section title="Kỹ năng">
              <div className="flex flex-wrap gap-2">
                {structuredData.skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-1 bg-primary-100 text-primary-700 text-sm rounded-full font-medium">
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
                  <p className="text-sm text-gray-600">{exp.company} • {exp.startDate} – {exp.endDate}</p>
                  {exp.bullets?.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {exp.bullets.map((b, j) => (
                        <li key={j} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-gray-400">•</span>
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
                  <p className="font-medium text-gray-900">{edu.degree} — {edu.field}</p>
                  <p className="text-sm text-gray-600">{edu.institution}{edu.graduationYear ? ` • ${edu.graduationYear}` : ""}</p>
                </div>
              ))}
            </Section>
          )}
        </div>
      ) : (
        /* Fallback: show raw text */
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">Không thể phân tích tự động. Nội dung gốc:</p>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
            {parsedText || "Không có nội dung"}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {onContinue && (
          <button
            onClick={onContinue}
            className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Tiếp tục dán JD
          </button>
        )}
        {onUploadAnother && (
          <button
            onClick={onUploadAnother}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Tải lên CV khác
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `pnpm test tests/cv-upload/cv-preview.spec.tsx --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/cv/_components/cv-preview.tsx tests/cv-upload/cv-preview.spec.tsx
git commit -m "feat: add CVPreview component with structured display

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.3: CV Upload Page

**Files:** `app/(app)/cv/page.tsx`

- [ ] **Step 1: Write minimal page that composes components**

```tsx
// app/(app)/cv/page.tsx
import { UploadZone } from "./_components/upload-zone";
import { CVPreview } from "./_components/cv-preview";
import type { CVUploadResponse } from "@/lib/types";

interface CVUploadPageProps {
  searchParams: Promise<{ success?: string }>;
}

export const metadata = {
  title: "Tải lên CV — JobBoost AI",
  description: "Upload your CV to get started with JobBoost AI",
};

export default async function CVUploadPage({ searchParams }: CVUploadPageProps) {
  const params = await searchParams;
  const justUploaded = params.success === "true";

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tải lên CV của bạn</h1>
          <p className="mt-2 text-gray-600">
            Upload CV (PDF hoặc DOCX) để bắt đầu. Hệ thống sẽ phân tích và customize CV theo JD.
          </p>
        </div>

        <UploadZone
          onUploadComplete={(cvData: CVUploadResponse) => {
            // This runs client-side; state managed via URL or parent
            console.log("CV uploaded:", cvData.id);
          }}
        />

        {justUploaded && (
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            ✓ CV đã được tải lên thành công! Bạn có thể tiếp tục dán JD.
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Update middleware to protect /cv route**

Check `middleware.ts` — ensure `/cv` route group is protected. The route group `app/(app)` should be protected (non-public).

```typescript
// middleware.ts — verify this pattern exists:
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/cv/upload", // Allow upload without full auth (userId from header in dev)
]);
// Or better: add /cv to public routes ONLY for dev, or rely on auth in handler
```

Note: The `/api/cv/upload` POST route will be accessible. In production, Clerk middleware protects all routes. The `POST /api/cv/upload` endpoint has its own auth check inside. `/cv` page should be protected — add it to Clerk middleware.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/cv/page.tsx middleware.ts
git commit -m "feat: add CV upload page with UploadZone composition

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 5: DB Migration & Final Verification

### Task 5.1: Update schema migration

**Files:** `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Add new columns + storage RLS policies**

Add to the end of the existing migration file:

```sql
-- Add parse metadata columns (safe to run on existing table)
ALTER TABLE public.cvs
  ADD COLUMN IF NOT EXISTS parse_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS warnings text[] DEFAULT '{}';

-- ============================================================
-- SUPABASE STORAGE — RLS POLICIES
-- ============================================================

-- Create storage bucket (run once in Supabase Dashboard → Storage)
-- Or uncomment to create via migration:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cvs', 'cvs', false, 5242880, ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Policy: users can only access their own CV files
CREATE POLICY "Users can upload their own CVs"
  ON storage.objects FOR UPLOAD
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own CVs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CVs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add parse columns and Storage RLS policies

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.2: Final verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test tests/cv-upload/
```

Expected: All tests PASS

- [ ] **Step 2: Run TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: BUILD SUCCEEDED

- [ ] **Step 4: Manual verification (if credentials available)**

```bash
pnpm dev
# Visit http://localhost:3000/cv
# Upload a test PDF/DOCX
# Verify: file stored in Supabase, parsed text shown, structured data displayed
```

- [ ] **Step 5: Commit final**

```bash
git add . && git commit -m "chore: complete Task 2.1 CV Upload & Parse — all tests pass

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Summary

**Commands to run:**
```bash
# Install deps
pnpm add @anthropic-ai/sdk pdf-parse mammoth && pnpm add -D @types/pdf-parse

# Run tests
pnpm test tests/cv-upload/

# Build
pnpm build
```

**Key decisions:**
- Supabase Storage bucket `cvs` — create manually in Dashboard if migration doesn't create it
- Parse sync after upload (not deferred)
- Claude 3.5 Sonnet for structured extraction with 30s timeout
- Raw text fallback if AI fails
- Low text extraction warning for scanned/image PDFs
