# JobBoost AI — System Architecture

> **Stack:** Next.js App Router · Neon PostgreSQL · Clerk Auth · Stripe · Resend · Vercel  
> **Date:** 2026-03-27  
> **Stage:** MVP  

---

## 1. High-level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│   Browser / Mobile Web                                                        │
│   Next.js App Router (React Server Components + Route Handlers)             │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / API LAYER                                    │
│                                                                               │
│   Route Handlers  ──► Clerk middleware ──► JWT verification                   │
│   (app/api/*)     ──► Rate limiter (Upstash Redis)                          │
│                                                                               │
│   Middleware chain: [Auth] → [RateLimit] → [Handler]                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────────┐
│      AI LAYER      │  │    DATA LAYER      │  │      EXTERNAL SERVICES     │
│                    │  │                    │  │                            │
│  OpenAI GPT-4o    │  │  Neon PostgreSQL   │  │  Stripe                    │
│  + Batch API      │  │  (serverless)      │  │  Resend                    │
│  + Structured      │  │                    │  │  Uploadthing / S3-compatible│
│    outputs (JSON)  │  │  Upstash Redis     │  │  (CV file storage)         │
│                    │  │  (rate limits,     │  │                            │
│  Tavily Web Search │  │   sessions, jobs)  │  │  Tavily (company research) │
│  (company reports) │  │                    │  │                            │
└────────────────────┘  └────────────────────┘  └────────────────────────────┘
```

**Key architectural principles:**
- **Serverless-first:** All logic lives in Next.js Route Handlers (no dedicated backend)
- **Stateless AI calls:** Each generation is a fresh API call; no conversation memory
- **Job-scoped isolation:** Every user action is scoped to a `job_id` — supports multi-job workflows
- **Optimistic UX:** Client shows results immediately; async processing for heavy AI calls

---

## 2. Data Flow

### 2.1 Core Flow: Upload → Parse → Paste JD → Pay → Generate → Email

```
User          Next.js               AI / Services           Database            External
 │                │                        │                     │                   │
 │──Upload CV──────►                        │                     │                   │
 │                │──► Parse CV (AI)──────►│                     │                   │
 │                │◄── Structured CV JSON──│                     │                   │
 │◄──CV Preview───│                        │                     │                   │
 │                │                        │                     │──Insert job────────▶│
 │──Paste JD──────►                        │                     │                   │
 │                │──► JD Analyze (AI)────►│                     │                   │
 │◄──Match Score──│                        │                     │                   │
 │                │                        │                     │                   │
 │──Pay (per-job)─►                        │                     │                   │
 │                │──Create Stripe Checkout───────────────────────▶│                   │
 │◄──Stripe URL───│                        │                     │                   │
 │──Redirect──────►                        │                     │                   │
 │                │◄─Webhook: payment_succeeded───────────────────────────────│
 │                │                        │                     │──Mark paid────────▶│
 │                │──► Generate all───────►│                     │                   │
 │                │◄── CV, Report, Q&A─────│                     │──Save results─────▶│
 │◄──Results───────│                        │                     │                   │
 │                │──► Send email───────────────────────────────────────────────▶Resend
 │◄──Email────────│                        │                     │                   │
```

### 2.2 Data Shapes Between Services

```typescript
// 1. Upload CV → stored as file reference
interface CVUpload {
  fileKey: string;          // e.g. "cv/{userId}/{jobId}/{filename}"
  originalName: string;
  mimeType: string;         // "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  sizeBytes: number;
  uploadedAt: Date;
}

// 2. Parse CV → structured JSON
interface ParsedCV {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedIn?: string;
    portfolio?: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string | "Present";
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationYear: number;
  }>;
  skills: string[];
  rawText: string;          // original text for AI reference
}

// 3. Job record (created after JD paste, before payment)
interface Job {
  id: string;               // nanoid
  userId: string;           // Clerk user ID
  status: "cv_uploaded" | "jd_analyzed" | "pending_payment" | "paid" | "generating" | "complete" | "failed";
  cvFileKey: string;
  parsedCv: ParsedCV | null;
  jobDescription: string | null;
  jdAnalysis: JDAnalysis | null;
  matchScore: number | null; // 0-100
  stripeSessionId: string | null;
  results: GeneratedResults | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;          // 30 days after generation
}

// 4. JD Analysis result
interface JDAnalysis {
  structured: {
    title: string;
    company: string;
    seniority: string;
    requiredSkills: string[];
    preferredSkills: string[];
    keyResponsibilities: string[];
    evaluationCriteria: string[];
  };
  matchScore: number;
  gaps: string[];            // skills/experience gaps to address in CV
}

// 5. Generated Results
interface GeneratedResults {
  customizedCvText: string;  // AI-customized CV content
  customizedCvHtml: string;    // formatted for download
  companyReport: CompanyReport;
  interviewQA: InterviewQA[];
  techPrep: TechPrepSheet;
  generatedAt: Date;
}

// 6. Company Report
interface CompanyReport {
  companyName: string;
  overview: string;
  mission: string;
  recentNews: Array<{ headline: string; source: string; date: string }>;
  culture: string;
  interviewProcess: string;
  commonQuestions: string[];
  tips: string[];
}

// 7. Interview Q&A
interface InterviewQA {
  question: string;
  type: "behavioral" | "situational" | "technical";
  idealAnswer: string;
  followUpQuestions: string[];
}

// 8. Tech Prep Sheet
interface TechPrepSheet {
  role: string;
  coreTopics: Array<{
    topic: string;
    depth: "basic" | "intermediate" | "advanced";
    keyPoints: string[];
    resources: string[];
  }>;
  systemDesign?: Array<{
    problem: string;
    approach: string;
    considerations: string[];
  }>;
  codingPatterns: string[];
}
```

---

## 3. API Design

All routes live under `app/api/`.  
**Auth:** All routes require Clerk session (`auth()`) except Stripe webhooks.  
**Errors:** Consistent shape — `{ error: string, code: string, details?: unknown }`.

---

### 3.1 `POST /api/cv/upload`

**Purpose:** Receive uploaded CV file, store temporarily, return file key.

**Auth:** Required (Clerk session)

**Input (multipart/form-data):**
```json
{
  "file": File,           // PDF or DOCX, max 10MB
  "jobId": "job_abc123"   // optional — if provided, associates file with job
}
```

**Output (200):**
```json
{
  "fileKey": "cv/user_123/job_abc123/resume.pdf",
  "originalName": "resume.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245000
}
```

**Errors:**
- `400 INVALID_FILE_TYPE` — not PDF/DOCX
- `400 FILE_TOO_LARGE` — over 10MB
- `401 UNAUTHORIZED`
- `429 RATE_LIMITED`

**Implementation notes:**
- Use **Uploadthing** (S3-compatible) for file storage
- Files stored at `cv/{userId}/{jobId}/{filename}` path
- `Content-Disposition: attachment` to prevent direct browser access
- Server-side file type verification (not just extension)

---

### 3.2 `POST /api/cv/parse`

**Purpose:** Extract structured data from uploaded CV using AI.

**Auth:** Required

**Input:**
```json
{
  "fileKey": "cv/user_123/job_abc123/resume.pdf"
}
```

**Output (200):**
```json
{
  "parsedCv": { /* ParsedCV shape */ },
  "confidence": 0.87,
  "warnings": ["Could not parse end date for role at Acme Corp"]
}
```

**Errors:**
- `400 MISSING_FILE_KEY`
- `404 FILE_NOT_FOUND`
- `422 PARSE_FAILED` — AI failed to extract

**Implementation notes:**
- First, download file from storage → extract text (pdf-parse or mammoth)
- Send raw text + prompt to OpenAI GPT-4o with JSON schema output
- Cache parse result in DB keyed to `fileKey` hash (avoid re-parsing)
- 30-second timeout; fallback to manual-entry UI if AI fails

---

### 3.3 `POST /api/jd/analyze`

**Purpose:** Parse job description, calculate match score, identify gaps.

**Auth:** Required

**Input:**
```json
{
  "jobId": "job_abc123",
  "jobDescription": "We are looking for a Senior Frontend Engineer...\n\nRequirements:\n- 5+ years React experience\n- TypeScript proficiency\n..."
}
```

**Output (200):**
```json
{
  "jdAnalysis": { /* JDAnalysis shape */ },
  "matchScore": 72,
  "topMatchedSkills": ["React", "TypeScript", "CSS"],
  "topGaps": ["Kubernetes", "GraphQL"],
  "recommendations": ["Add Kubernetes experience from side projects"]
}
```

**Errors:**
- `400 EMPTY_JOB_DESCRIPTION`
- `404 JOB_NOT_FOUND`
- `422 JD_PARSE_FAILED`

**Implementation notes:**
- Two-step AI call:
  1. Extract structured requirements (JSON schema)
  2. Compare against parsed CV skills (already in DB) for match score
- Match score = `(matched_required_skills / total_required_skills) × 100`, weighted by seniority

---

### 3.4 `POST /api/generate/customize-cv`

**Purpose:** AI rewrites CV to target a specific job description.

**Auth:** Required

**Input:**
```json
{
  "jobId": "job_abc123",
  "style": " ATS-optimized"  // "ATS-optimized" | "human-readable" | "executive"
}
```

**Output (200):**
```json
{
  "customizedCv": {
    "text": "Maria Chen — Senior Frontend Engineer\n\nObjective: Seeking to leverage 6+ years of React...",
    "sections": {
      "summary": "...",
      "experience": [...],
      "skills": [...]
    },
    "atsScore": 91,
    "changesMade": [
      "Added keyword 'TypeScript' to summary (JD requirement)",
      "Reordered experience: Amazon role first (most relevant)",
      "Added metrics to Amazon bullets (42% performance improvement)"
    ]
  },
  "tokensUsed": 1840,
  "processingMs": 8200
}
```

**Errors:**
- `400 MISSING_PARSED_CV`
- `400 MISSING_JOB_DESCRIPTION`
- `409 JOB_NOT_PAID` — generate without payment
- `422 GENERATION_FAILED`

**Implementation notes:**
- Use OpenAI **Structured Outputs** (JSON mode) for consistent schema
- Style parameter controls prompt template
- Include `changesMade` array so user sees what AI changed (trust signal)
- Store result in DB, return immediately (optimistic UI)

---

### 3.5 `POST /api/generate/company-research`

**Purpose:** AI generates company research report via web search.

**Auth:** Required

**Input:**
```json
{
  "jobId": "job_abc123",
  "companyName": "Stripe",
  "role": "Senior Frontend Engineer"
}
```

**Output (200):**
```json
{
  "companyReport": { /* CompanyReport shape */ },
  "sources": [
    { "url": "https://stripe.com/about", "accessedAt": "2026-03-27" },
    { "url": "https://www.glassdoor.com/Overview/stripe", "accessedAt": "2026-03-27" }
  ],
  "tokensUsed": 3200,
  "webSearchUsed": true
}
```

**Errors:**
- `400 MISSING_COMPANY`
- `422 RESEARCH_FAILED`

**Implementation notes:**
- Use **Tavily AI** for web search (dedicated search API, not raw browser)
- Tavily search → extract top 10 results → feed into GPT-4o synthesis prompt
- Cache reports by `companyName + role` hash for 24 hours (avoid re-searching)
- Fallback to static prompt (no web search) if Tavily is unavailable

---

### 3.6 `POST /api/generate/interview-qa`

**Purpose:** Generate behavioral and situational interview questions with model answers.

**Auth:** Required

**Input:**
```json
{
  "jobId": "job_abc123",
  "count": 8,
  "types": ["behavioral", "situational"]  // optional filter
}
```

**Output (200):**
```json
{
  "interviewQA": [ /* InterviewQA[] shape */ ],
  "questionCount": 8,
  "types": ["behavioral", "situational", "technical"],
  "tokensUsed": 2100
}
```

---

### 3.7 `POST /api/generate/tech-prep`

**Purpose:** Generate technical cheat sheet for the target role.

**Auth:** Required

**Input:**
```json
{
  "jobId": "job_abc123",
  "depth": "intermediate"  // "basic" | "intermediate" | "advanced"
}
```

**Output (200):**
```json
{
  "techPrep": { /* TechPrepSheet shape */ },
  "depth": "intermediate",
  "estimatedStudyHours": 12,
  "tokensUsed": 2800
}
```

---

### 3.8 `POST /api/payment/create-checkout`

**Purpose:** Create Stripe Checkout session for per-job payment.

**Auth:** Required

**Input:**
```json
{
  "jobId": "job_abc123",
  "priceId": "price_123"     // Stripe Price ID from product catalog
}
```

**Output (200):**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/...",
  "sessionId": "cs_test_abc123",
  "amount": 999,             // cents
  "currency": "usd",
  "expiresAt": "2026-03-27T13:00:00Z"
}
```

**Errors:**
- `400 JOB_ALREADY_PAID`
- `404 JOB_NOT_FOUND`
- `500 STRIPE_ERROR`

**Implementation notes:**
- Pass `jobId` in Stripe `metadata` for webhook correlation
- Set `success_url` and `cancel_url` to frontend pages
- Set `expires` on session (15 minutes)
- Store `stripeSessionId` in Job record

---

### 3.9 `POST /api/webhook/stripe`

**Purpose:** Handle Stripe webhook events (payment success = unlock generation).

**Auth:** Stripe signature verification (no Clerk auth)

**Handled events:**
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Update job status → `paid`, trigger async generation |
| `checkout.session.expired` | Update job status → `pending_payment` |
| `payment_intent.payment_failed` | Log failure, notify user via email |
| `charge.refunded` | Revoke access, expire results |

**Input:** Raw Stripe event body (from ` stripe.webhooks.constructEvent`)

**Output (200):** `{ received: true }`

**Errors:**
- `400 INVALID_SIGNATURE`
- `400 UNHANDLED_EVENT_TYPE`
- `500 WEBHOOK_PROCESSING_FAILED`

**Implementation notes:**
- Verify signature using `STRIPE_WEBHOOK_SECRET` env var
- Use **Svix** or manual timestamp check to prevent replay attacks
- Idempotency: check if event already processed (store `eventId` in DB)
- Generation triggered as **background job** (Vercel Background Functions or queue)

---

### 3.10 `POST /api/email/send-results`

**Purpose:** Trigger Resend email delivery with all generated results.

**Auth:** Required (Clerk); called internally after generation completes.

**Input:**
```json
{
  "jobId": "job_abc123",
  "recipientEmail": "maria@example.com",  // override, defaults to Clerk user email
  "includeAttachments": true
}
```

**Output (200):**
```json
{
  "emailId": "resend_abc123",
  "recipient": "maria@example.com",
  "subject": "Your JobBoost results for Senior Frontend Engineer at Stripe",
  "sentAt": "2026-03-27T10:05:00Z"
}
```

**Errors:**
- `404 JOB_NOT_FOUND`
- `409 JOB_NOT_COMPLETE`
- `422 EMAIL_DELIVERY_FAILED`

**Implementation notes:**
- Use **Resend React Email** for HTML templates
- Attach: customized CV (PDF), tech prep sheet (PDF)
- Inline in email: summary + top 5 Q&A
- Track delivery status via Resend webhook (`email.delivered`, `email.bounced`)

---

## 4. AI Prompt Strategy

### 4.1 CV Customization Prompt Approach

**System prompt:**
```
You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist.
You have deep knowledge of how recruiters and hiring managers evaluate candidates.
You understand tech industry roles (frontend, backend, fullstack, data, ML, DevOps, product, design).

Your goals:
1. Maximize ATS keyword match with the job description
2. Maintain factual accuracy — NEVER fabricate experience, skills, or metrics
3. Write compelling, quantified achievement bullets
4. Use active voice and strong action verbs
5. Keep formatting clean for both ATS scanners and human readers
```

**User prompt template:**
```
## YOUR CURRENT CV
{structured_cv_text}

## TARGET JOB DESCRIPTION
{job_description}

## CUSTOMIZATION STYLE
{style: ATS-optimized | human-readable | executive}

## INSTRUCTIONS
1. Rewrite the summary/objective to highlight the most relevant experience for this role
2. Reorder experience sections so the most relevant roles appear first
3. For each experience bullet: add ATS keywords from the JD while preserving real achievements
4. If a metric exists in the CV, keep and emphasize it. If it does not exist, do NOT invent one.
5. Add missing ATS keywords from the JD into the skills section if the candidate genuinely has that skill
6. Remove or de-emphasize experience bullets that are irrelevant to this JD

## OUTPUT FORMAT
Return a JSON object with:
- "text": full customized CV as plain text (markdown)
- "sections": structured sections object
- "atsScore": estimated ATS compatibility score (0-100)
- "changesMade": array of specific changes made and why
```

**Key tactics:**
- Use `response_format: { type: "json_schema", ... }` for guaranteed structure
- Set `temperature: 0.3` — creative but factual (never hallucinate)
- Truncate input to last 8KB of CV text to manage token budget

---

### 4.2 Company Research Prompt (Web Search Integration)

**Flow:**
1. **Tavily search** for: `"{company} company culture mission"`, `"{company} interview process"`, `"{company} recent news 2026"`
2. **Synthesis prompt** (feed in search results):

```
## SEARCH RESULTS
{tavily_results_json}

## TARGET ROLE
{job_title} at {company_name}

## TASK
Synthesize a comprehensive company research report for a job candidate.

## OUTPUT FORMAT (JSON):
- "companyName": string
- "overview": 2-3 sentence company description
- "mission": company's stated mission (quote if available)
- "recentNews": array of {headline, source, date} — 3 most relevant
- "culture": 2-3 sentences on work culture and values
- "interviewProcess": what to expect in the interview loop
- "commonQuestions": 3-5 questions candidates report being asked
- "tips": 4-5 insider tips for this company's interview
```

---

### 4.3 Interview Q&A Generation

**System prompt:**
```
You are an expert interview coach with experience at FAANG and top-tier tech companies.
Generate realistic, high-quality interview questions with model answers.
Answers should be STAR-method structured (Situation, Task, Action, Result) for behavioral questions.
```

**User prompt template:**
```
## CANDIDATE BACKGROUND
{parsed_cv_text}

## JOB DESCRIPTION
{job_description}

## QUESTION TYPES REQUESTED
{types: behavioral | situational | technical}

## COUNT
{count: 5-10}

## INSTRUCTIONS
Generate {count} interview questions of type(s) {types}.

For BEHAVIORAL questions:
- Use real-world scenarios relevant to the candidate's experience
- Include the question, STAR-structured ideal answer, and 2 follow-up questions

For SITUATIONAL questions:
- Frame around challenges they'd likely face in this role
- Include ideal response framework

For TECHNICAL questions:
- Base on the required skills in the job description
- Include conceptual answer + code example where applicable
```

---

### 4.4 Tech Knowledge Extraction

**System prompt:**
```
You are a technical interviewer and educator specializing in {role_category}.
Generate a focused technical preparation cheat sheet.
Content must be accurate, prioritized by interview importance, and include practical resources.
```

**User prompt template:**
```
## ROLE
{job_title}

## REQUIRED SKILLS
{skills_from_jd}

## PREFERRED SKILLS
{preferred_skills}

## DEPTH LEVEL
{depth: basic | intermediate | advanced}

## INSTRUCTIONS
Generate a technical cheat sheet covering:

1. CORE TOPICS: Top 8-12 technical topics ranked by interview frequency
   - For each: depth level, 3-5 key points, 1-2 recommended resources

2. CODING PATTERNS: Top 5 LeetCode/GitHub patterns that appear in interviews for this role

3. SYSTEM DESIGN (if senior): One realistic system design problem with approach

4. ESTIMATED STUDY HOURS: total hours needed at the specified depth level
```

---

## 5. Security Considerations

### 5.1 CV File Storage

| Concern | Solution |
|---------|----------|
| **Where** | Uploadthing (S3-compatible bucket) — private bucket, no public access |
| **Path structure** | `cv/{clerkUserId}/{jobId}/{filename}` — user cannot access other users' files |
| **Encryption at rest** | S3 server-side encryption (AES-256), enabled in bucket policy |
| **Encryption in transit** | TLS 1.2+ enforced by Uploadthing |
| **Access control** | All reads go through API route that verifies Clerk `userId` matches path |
| **Retention** | Files deleted 30 days after job creation OR after results email sent + 7 days |
| **Max file size** | 10MB enforced server-side and in Uploadthing config |
| **Allowed types** | `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| **Virus scanning** | Uploadthing PRO plan includes file scanning; fallback: VirusTotal API for MVP |

### 5.2 API Authentication (Clerk)

```typescript
// middleware.ts — apply to all /api/* routes
import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  publicRoutes: ["/api/webhook/stripe", "/api/health"],
});

export const config = {
  matcher: ["/api/(.*)", "/(.*)(@[a-zA-Z0-9-]+)"],
};
```

```typescript
// In each route handler:
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user owns the job resource
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  // proceed...
}
```

### 5.3 Stripe Webhook Security

```typescript
// app/api/webhook/stripe/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: skip if event already processed
  const processed = await db.processedStripeEvents.findUnique({
    where: { eventId: event.id },
  });
  if (processed) return Response.json({ received: true });

  // Process event...
  await db.processedStripeEvents.create({ data: { eventId: event.id } });
  return Response.json({ received: true });
}
```

### 5.4 Rate Limiting

| Endpoint | Limit | Window | Implementation |
|----------|-------|--------|----------------|
| `/api/cv/parse` | 10 | per minute | Upstash Redis |
| `/api/jd/analyze` | 20 | per minute | Upstash Redis |
| `/api/generate/*` | 5 | per minute | Upstash Redis |
| `/api/payment/create-checkout` | 3 | per minute | Upstash Redis |
| All others | 100 | per minute | Upstash Redis |

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "ratelimit:generate",
});

export async function rateLimit(identifier: string) {
  const { success, remaining, reset } = await ratelimit.limit(identifier);
  if (!success) {
    return Response.json(
      { error: "Rate limit exceeded", retryAfter: reset },
      { status: 429 }
    );
  }
}
```

### 5.5 Additional Security Measures

- **Input sanitization:** All user-provided JD text sanitized before storing (no XSS in the web UI)
- **SQL injection:** Prisma ORM with parameterized queries throughout
- **Prompt injection (AI):** System prompts are static, never constructed from user input
- **Secrets management:** All secrets in Vercel Environment Variables (not .env in repo)
- **CORS:** API routes only respond to requests from known origins
- **Audit log:** All payment and generation events logged with timestamp + userId for compliance
