# Task 2.2: JD Input & Analysis — Design Spec

> **Status:** Approved 2026-03-29
> **Owner:** Claude
> **Dependencies:** Task 1.3 (Core Data Models), Task 2.1 (CV Upload & Parse)

---

## 1. Overview

**Goal:** Parse Job Description from 3 input modes (paste text / URL / file upload), extract structured JD data, calculate match score with uploaded CV, and return analysis via API.

**Non-goal:** No UI in this task — API backend only. UI/dashboard will be built in Task 4.3.

---

## 2. Input Modes

| Mode | Source | How it works |
|------|--------|-------------|
| **Paste text** | `jdText` field | Direct AI parsing |
| **URL scraping** | `jdUrl` field | Fetch HTML → cheerio extract JD → AI parse |
| **File upload** | `jdFile` (FormData) | pdf-parse / mammoth → text → AI parse |

Priority: `jdText` > `jdUrl` > `jdFile`. At least one required.

### Supported Scraping Sites

| Site | Parser | Key selectors |
|------|--------|---------------|
| LinkedIn | cheerio | `.jobs-details__sub-title`, `.job-details-skill-match-status-list__skill`, `article` |
| VietnamWorks | cheerio | `.job-description`, `.job-requirements` |
| CareerViet | cheerio | `.content`, `article` |
| Glints | cheerio | `.JobDescriptionSection`, `.opportunity-details` |
| TopCV | cheerio | `.jd-content`, `.job-description` |
| Generic fallback | cheerio | Extract `<article>`, `<section>` text blocks |

No headless browser needed — all sites are server-renderable.

---

## 3. Data Models

### ParsedJDData

```typescript
interface ParsedJDData {
  jobTitle: string | null;
  companyName: string | null;
  requiredSkills: string[];       // normalized skill names, NOT sentences
  niceToHave: string[];
  responsibilities: string[];
  requirements: string[];
  experienceLevel: string | null; // e.g. "Senior", "Mid-level", "Fresher"
  salaryRange: string | null;     // raw text as-is, null if not disclosed
  location: string | null;
  employmentType: string | null;   // "Full-time", "Remote", "Contract", etc.
}
```

### SkillMatchResult

```typescript
interface SkillMatchResult {
  matchPercentage: number; // 0–100
  matchedSkills: string[];  // in both CV and JD
  missingSkills: string[]; // in JD but not CV
  extraSkills: string[];    // in CV but not JD
}
```

### JDAnalysisResponse

```typescript
interface JDAnalysisResponse {
  jdText: string;           // raw source text used for parsing
  sourceType: "text" | "url" | "file";
  parsed: ParsedJDData | null;
  matchResult: SkillMatchResult | null;
  confidence: number | null; // 0–1, based on completeness of parsed fields
  warnings: string[];
  jobApplicationId?: string; // if auto-created JobApplication record
}
```

### Warning Codes

```typescript
type WarningCode =
  | "AI_SKIP_NO_KEY"    // OPENAI_API_KEY not set
  | "AI_TIMEOUT"        // >30s timeout
  | "PARSE_FAILED"      // JSON parse error or invalid response
  | "SHORT_JD"          // JD text < 50 chars (low confidence)
  | "SCRAPE_FAILED"     // URL fetch error / blocked / timeout
  | "NO_JD_FOUND"       // Scraped HTML returned no text
  | "INVALID_URL"       // Malformed URL
  | "FILE_TOO_LARGE"    // >10MB
  | "UNSUPPORTED_FILE"  // Not PDF/DOCX
  | "CV_NOT_FOUND"      // cvId does not exist
  | "CV_OWNERSHIP_DENIED"; // user doesn't own this CV
```

---

## 4. Library: JD Parser (`lib/jd-parser.ts`)

**Pattern:** Mirror `lib/cv-parser.ts` exactly.

- SDK: `openai` (lazy-load via dynamic `import()`)
- Model: `gpt-4o-mini` — cheap + fast, sufficient for extraction
- Env: `process.env.OPENAI_API_KEY`
- Timeout: 30s via `Promise.race`
- Token budget: JD text truncate to 6,000 chars
- Output: JSON from GPT response → parse → validate

**System prompt key instruction:**
> "You are a job description parser. Extract fields in Vietnamese or English. Return null for fields not found. requiredSkills should be array of normalized skill names (e.g., 'React', 'TypeScript', 'AWS' — NOT sentences). Output ONLY valid JSON."

**Graceful degradation:** If no key, return `{ parsed: null, confidence: null, warnings: ["AI_SKIP_NO_KEY"] }`.

---

## 5. Library: Match Score Engine (`lib/match-score.ts`)

**No AI required** — pure algorithmic comparison.

```typescript
function normalizeSkill(skill: string): string {
  // lowercase, trim, map aliases
  const aliases: Record<string, string> = {
    js: "javascript", ts: "typescript", tsx: "react",
    node: "node.js", nodejs: "node.js", py: "python",
    aws: "amazon web services", gcp: "google cloud platform",
    // add common aliases as needed
  };
  const normalized = skill.toLowerCase().trim();
  return aliases[normalized] ?? normalized;
}

function calculateMatchScore(
  cvSkills: string[],
  jdSkills: string[]
): SkillMatchResult {
  const cvSet = new Set(cvSkills.map(normalizeSkill));
  const jdSet = new Set(jdSkills.map(normalizeSkill));

  const matched = [...jdSet].filter(s => cvSet.has(s));
  const missing = [...jdSet].filter(s => !cvSet.has(s));
  const extra = [...cvSet].filter(s => !jdSet.has(s));

  const matchPercentage = jdSet.size > 0
    ? Math.round((matched.length / jdSet.size) * 100)
    : 0;

  return { matchPercentage, matchedSkills: matched, missingSkills: missing, extraSkills: extra };
}
```

---

## 6. API Endpoints

### POST `/api/jobs/analyze`

Main endpoint — parse JD + calculate match score + optionally create JobApplication.

**Request (JSON or FormData):**

```typescript
// JSON
{ jdText?: string; jdUrl?: string; cvId: string; autoCreateJob?: boolean; }

// FormData (for file upload)
{ jdFile: File; cvId: string; autoCreateJob?: boolean; }
```

**Response:** `JDAnalysisResponse` (always 200, warnings in body)

**Side effect:** If `autoCreateJob: true` + valid cvId + authorized → insert `JobApplication` with status `"jd_analyzed"`.

**Auth:** `getServerUserId()` → 401 if not authenticated.

**Validation rules:**
- At least one of `jdText`/`jdUrl`/`jdFile` required
- `jdText` ≥ 50 chars (warn `SHORT_JD` if < 50)
- `jdUrl` valid HTTPS URL
- `jdFile` ≤ 10MB, MIME type `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `cvId` must exist in DB + owned by current user

**Flow:**
```
1. Auth check → 401
2. Parse input (text/url/file)
3. Lookup CV by cvId + verify ownership → CV_NOT_FOUND or CV_OWNERSHIP_DENIED if fail
4. Get CV structured skills from DB
5. If jdUrl → /api/jobs/scrape → rawText
6. If jdFile → pdf-parse / mammoth → rawText
7. Call jd-parser.ts → ParsedJDData
8. Call match-score.ts → SkillMatchResult (using CV skills from DB)
9. Optionally create JobApplication record
10. Return JDAnalysisResponse
```

### POST `/api/jobs/scrape`

Standalone endpoint — fetch URL and extract raw JD text.

**Request:** `{ url: string }`

**Response:**
```typescript
{ rawText: string; source: string; warnings: string[]; }
```
`source`: `"linkedin"` | `"vietnamworks"` | `"careerviet"` | `"glints"` | `"topcv"` | `"generic"` | `"error"`

**Validation:** URL must be valid HTTPS.

**Error responses:**
- `INVALID_URL` → HTTP 400
- `FETCH_FAILED` / `NO_JD_FOUND` → HTTP 200 with warnings

---

## 7. Testing Plan

**Test files:** `api-tests/tests/jd-analyze.test.ts`, `api-tests/tests/jd-scrape.test.ts`, `api-tests/tests/jd-match-score.test.ts`

**Test cases:**

| Test | Expected |
|------|----------|
| `POST /api/jobs/analyze` without auth | 401 |
| `POST /api/jobs/analyze` no input | 400 `{ error: "MISSING_INPUT" }` |
| `POST /api/jobs/analyze` valid `jdText` + `cvId` | 200, has `parsed.jobTitle` |
| `POST /api/jobs/analyze` valid `jdUrl` (LinkedIn) | 200, `sourceType: "url"` |
| `POST /api/jobs/analyze` valid `jdFile` (PDF) | 200, `sourceType: "file"` |
| `POST /api/jobs/analyze` invalid `cvId` | 200, `warnings: ["CV_NOT_FOUND"]` |
| `POST /api/jobs/analyze` wrong user cvId | 200, `warnings: ["CV_OWNERSHIP_DENIED"]` |
| `POST /api/jobs/analyze` `jdText` < 50 chars | 200, `warnings` includes `"SHORT_JD"` |
| `POST /api/jobs/scrape` LinkedIn URL | 200, `rawText.length > 0` |
| `POST /api/jobs/scrape` VietnamWorks URL | 200, `rawText.length > 0` |
| `POST /api/jobs/scrape` unsupported domain | 200, `source: "generic"` |
| `POST /api/jobs/scrape` invalid URL | 400 |
| `calculateMatchScore` — full overlap | 100% |
| `calculateMatchScore` — partial overlap | correct % |
| `calculateMatchScore` — no overlap | 0% |
| `calculateMatchScore` — aliases normalized | "js" matches "javascript" |

---

## 8. Dependencies

```json
{
  "openai": "^4.85.0",
  "cheerio": "^1.0.0"
}
```

No headless browser. No new heavy dependencies.

---

## 9. File Map

| File | Action |
|------|--------|
| `lib/jd-parser.ts` | NEW — OpenAI JD parsing |
| `lib/match-score.ts` | NEW — skill comparison engine |
| `lib/types.ts` | MODIFY — add ParsedJDData, JDAnalysisResponse, SkillMatchResult |
| `app/api/jobs/scrape/route.ts` | NEW — POST /api/jobs/scrape |
| `app/api/jobs/analyze/route.ts` | NEW — POST /api/jobs/analyze |
| `package.json` | MODIFY — add `openai`, `cheerio` |
| `api-tests/tests/jd-analyze.test.ts` | NEW |
| `api-tests/tests/jd-scrape.test.ts` | NEW |
| `api-tests/tests/jd-match-score.test.ts` | NEW |
| `api-tests/seed/jobs.json` | MODIFY — add valid JD fixtures |

---

## 10. Acceptance Criteria (from ROADMAP)

- [ ] Paste JD text → parsed và hiển thị key requirements
- [ ] Match score CV-JD calculated và displayed
- [ ] URL scraping cho 5 site phổ biến (LinkedIn, VietnamWorks, CareerViet, Glints, TopCV)
- [ ] Graceful degradation when OpenAI key missing
- [ ] All tests pass

---

*Design approved by user on 2026-03-29.*
