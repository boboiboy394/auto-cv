# Task 2.1: CV Upload & Parse — Design Spec

> **Status:** Approved by user (2026-03-28)
> **Task:** `cv-upload-parse` — Phase 2, Priority 1
> **Dependencies:** Task 1.3 (Core Data Models) ✅

---

## 1. Overview

Cho phép user upload CV (PDF/DOCX) → hệ thống parse text → AI extract structured data → hiển thị preview cho user verify.

**Timing:** Parse sync ngay sau upload. User thấy kết quả parse trước khi proceed.

---

## 2. Storage Strategy

**Provider:** Supabase Storage (đã có infra)

**Bucket:** `cvs` — tạo trong Supabase Dashboard → Storage

**Path structure:**
```
cvs/{userId}/{cvId}/{filename}
```

**Access:** Private bucket — chỉ user sở hữu mới đọc được file qua RLS policies.

**File lifecycle:**
- Upload → lưu vào storage + DB record
- User có thể delete → xoá cả storage file + DB record
- Không auto-delete (sẽ handle ở Phase 4 với retention policy)

---

## 3. File Validation

| Rule | Value | Enforcement |
|------|-------|-------------|
| Allowed types | `application/pdf`, `.docx` | Client + Server |
| Max file size | **5MB** | Client + Server |
| Filename sanitization | Strip path traversal, keep original extension | Server |

**Validation errors:**
- `INVALID_FILE_TYPE` — không phải PDF/DOCX
- `FILE_TOO_LARGE` — vượt quá 5MB

---

## 4. Parse Pipeline

### Step 1: Upload to Supabase Storage
- Generate `cvId` = `crypto.randomUUID()`
- Upload to `cvs/{userId}/{cvId}/{filename}` with `content-type`
- Get public/internally accessible URL

### Step 2: Extract raw text
- **PDF:** `pdf-parse` — extract text from buffer
- **DOCX:** `mammoth` — extract text from buffer
- Fallback: nếu extracted text < 100 chars cho file > 50KB → return warning `"LOW_TEXT_EXTRACTION"`

### Step 3: AI Structured Extraction
- **Model:** Claude 3.5 Sonnet (`@anthropic-ai/sdk`)
- **Input:** raw CV text (truncate to 8KB token budget)
- **Output:** JSON matching `ParsedCVData` interface
- **Timeout:** 30 seconds
- **Fallback on timeout/fail:** `structuredData = null`, `warnings: ["PARSE_TIMEOUT" | "PARSE_FAILED"]`, vẫn lưu raw text

### Step 4: Update DB Record
- `parsed_text` = raw text
- `structured_data` = `ParsedCVData` JSON (or null if parse failed)
- `storage_path` = Supabase storage path

---

## 5. API Endpoints

### `POST /api/cv/upload`
**Input:** `multipart/form-data` — `file: File`

**Output (200):**
```json
{
  "id": "uuid",
  "originalName": "resume.pdf",
  "storagePath": "cvs/user123/cvId/resume.pdf",
  "parsedText": "Nguyễn Văn A\nEmail: nguyen@email.com\n...",
  "structuredData": {
    "personalInfo": { "name": "...", "email": "...", ... },
    "summary": "...",
    "experience": [...],
    "education": [...],
    "skills": [...]
  },
  "parseConfidence": 0.87,
  "warnings": []
}
```

**Errors:**
- `400 INVALID_FILE_TYPE`
- `400 FILE_TOO_LARGE`
- `413 PARSE_FAILED` (AI hoàn toàn fail — vẫn trả record với raw text)
- `401 UNAUTHORIZED`

### `GET /api/cv`
List all CVs for user — **already exists from 1.3**

### `GET /api/cv/:id`
Get single CV by ID — **already exists from 1.3**

### `DELETE /api/cv/:id`
Delete CV record + storage file.

---

## 6. Frontend Components

### `app/(app)/cv/page.tsx` — CV Upload Page
Route: `/cv` (protected by Clerk auth)

Composition:
```
CVUploadPage
├── PageHeader: "Tải lên CV của bạn"
├── UploadZone (idle / uploading / success / error)
├── CVPreview (conditional — after success)
└── NavigationFooter: "Tiếp tục dán JD" / "Upload CV khác"
```

### `UploadZone` — `app/(app)/cv/_components/upload-zone.tsx`
**States:**
- `idle` — dashed border, drag hint, "Kéo thả hoặc click để chọn file"
- `uploading` — progress bar (0-100%), filename
- `success` — green checkmark, filename, file size
- `error` — red border, error message, retry button

**Props:** `onUploadComplete: (cv: CVRecord) => void`

### `CVPreview` — `app/(app)/cv/_components/cv-preview.tsx`
**Sections displayed:**
- Personal Info (name, email, phone, location, LinkedIn, portfolio)
- Summary (parsed professional summary)
- Skills (tag list)
- Experience (company, title, dates, bullet points)
- Education (institution, degree, year)

**Confidence indicator:**
- `> 0.8` → 🟢 "Độ chính xác cao"
- `0.5–0.8` → 🟡 "Độ chính xác trung bình — vui lòng kiểm tra lại"
- `< 0.5` → 🔴 "Độ chính xác thấp — bạn có thể chỉnh sửa thủ công"

**Actions:**
- "Tải lên CV khác" → reset state
- "Tiếp tục" → navigate to JD paste

**Edge case:** If `structuredData === null` → show raw `parsedText` with note: "Không thể phân tích tự động. Bạn có thể xem nội dung bên dưới."

### `CVList` — `app/(app)/cv/_components/cv-list.tsx`
List all uploaded CVs with:
- Filename, upload date
- Parse status badge
- Actions: Delete, "Sử dụng" (select for job)

---

## 7. Error Handling

| Case | User Message | Action |
|------|-------------|--------|
| File not PDF/DOCX | "Chỉ hỗ trợ file PDF và DOCX." | Show error state |
| File > 5MB | "File quá lớn. Tối đa 5MB." | Show error state |
| Extracted text < 100 chars | "Không đọc được nội dung CV. Hãy thử file khác hoặc định dạng khác." | Save record, show warning |
| AI timeout (30s) | "Phân tích CV mất lâu hơn bình thường. Kết quả sẽ được gửi qua email." | Save raw text, return with warning |
| AI parse fail | "Không thể phân tích CV tự động. Nội dung đã được lưu." | Save raw text, show raw preview |
| Storage upload fail | "Không thể lưu file. Vui lòng thử lại." | Show retry UI |

---

## 8. Dependencies & Packages

```bash
pnpm add @anthropic-ai/sdk pdf-parse mammoth
pnpm add -D @types/pdf-parse
```

**Existing packages already in project:**
- `@supabase/supabase-js` — Supabase Storage client
- `nanoid` or `crypto.randomUUID()` — UUID generation

---

## 9. Files to Create/Modify

### Create
| File | Purpose |
|------|---------|
| `app/api/cv/upload/route.ts` | Upload endpoint with parse pipeline |
| `app/api/cv/[id]/route.ts` | GET/DELETE single CV (extend existing) |
| `lib/cv-parser.ts` | Pure functions: `extractTextFromPDF`, `extractTextFromDOCX`, `parseCVWithAI` |
| `app/(app)/cv/page.tsx` | CV upload page |
| `app/(app)/cv/_components/upload-zone.tsx` | Upload UI component |
| `app/(app)/cv/_components/cv-preview.tsx` | CV parsed data display |
| `tests/cv-upload/parse-pdf.spec.ts` | pdf-parse unit tests |
| `tests/cv-upload/parse-docx.spec.ts` | mammoth unit tests |
| `tests/cv-upload/api-upload.spec.ts` | API route integration tests |
| `tests/cv-upload/upload-zone.spec.tsx` | UploadZone component tests |

### Modify
| File | Change |
|------|--------|
| `lib/types.ts` | Add `parseConfidence`, `warnings[]` fields |
| `supabase/migrations/001_initial_schema.sql` | Add RLS policies for storage (enable after dev) |
| `.env.example` | Document Supabase Storage env vars (already covered) |

---

## 10. Out of Scope (do later)

- Multiple CV versions per user (store 2+ CVs) → v2
- CV file re-upload / version history → v2
- OCR for scanned PDFs (image-based CVs) → v2
- Manual CV text paste as alternative input → Phase 2.2 (JD Input)

---

## 11. Acceptance Criteria

- [ ] Upload PDF file ≤ 5MB → stored in Supabase Storage → parsed text displayed
- [ ] Upload DOCX file ≤ 5MB → stored → parsed text displayed
- [ ] Upload > 5MB → clear error message shown
- [ ] Upload non-PDF/DOCX → clear error message shown
- [ ] AI extraction returns structured data with name, email, skills, experience, education
- [ ] Low-confidence parse → warning badge shown, user can still proceed
- [ ] AI timeout → raw text saved, warning shown
- [ ] All Vitest tests pass
- [ ] Build passes with no new TypeScript errors
