# JobBoost AI — Feature Analysis

> **Product**: JobBoost AI  
> **Type**: SaaS MVP  
> **Target**: IT job seekers in Vietnam  
> **Language context**: Vietnamese UI + English JDs (bilingual)  
> **Price point**: ~49,000 VND (~≈ $2 USD) per job  
> **Phase**: Landing page → Full app  

---

## 1. Core Features

### Feature 1 — CV Customization

| Field | Detail |
|---|---|
| **What** | User uploads their CV PDF. User pastes a job description (JD). The AI rewrites the CV content to highlight the most relevant skills, experience, and keywords from the JD — producing a tailored PDF the user can download. |
| **Must have (MVP)** | ✅ Yes |
| **User pain point** | Recruiters spend ~6 seconds scanning a CV. Generic CVs get filtered out by ATS systems. Candidates know they should tailor each CV but don't know how, and rewriting manually is tedious and time-consuming (30–60 min per application). |
| **Complexity** | **Medium–High** |
| **Dependencies** | - PDF parser (extract text from uploaded CV) — e.g., pdfminer / pymupdf <br> - LLM call for rewrite (single AI provider) <br> - PDF generator (rebuild tailored CV as PDF) — e.g., reportlab / weasyprint <br> - File storage (store original + tailored CVs temporarily) — e.g., S3 / local disk <br> - Email delivery (send download link) |
| **Risks** | - PDF layout preservation is hard; most LLM outputs are plain text that must be re-flowed into a layout <br> - CVs with non-standard formats may break the parser <br> - Token usage per request is high (long CV + long JD + long output) → cost management needed |

---

### Feature 2 — Company Research Report

| Field | Detail |
|---|---|
| **What** | User pastes a company name (or JD which contains company context). The AI generates a structured research report covering: company overview, mission/values, products/services, company culture, recent news/press, and interview-relevant insights. Output is a readable web-view and PDF. |
| **Must have (MVP)** | ⚠️ Deferred to v2 |
| **User pain point** | Candidates show up to interviews without knowing the company's recent performance, culture, or products. "What do you know about us?" is a common first interview question they can't answer well. |
| **Complexity** | **Medium** (web search + LLM summarization) |
| **Dependencies** | - Web search API (e.g., SerpAPI, Tavily) to fetch live company data <br> - LLM call to synthesize into structured report <br> - Cache layer (same company queried multiple times — don't re-search) |
| **Risks** | - Real-time web search adds latency and per-query cost <br> - Vietnamese company data coverage in English search APIs may be poor <br> - Hallucination risk if search results are thin |

---

### Feature 3 — Mock Interview Q&A

| Field | Detail |
|---|---|
| **What** | Based on the uploaded CV and JD, the AI generates a personalized set of interview questions across two types: (1) **Behavioral** — STAR-format questions ("Tell me about a time when…"), (2) **Situational** — hypotheticals ("If you were asked to…"). Each question comes with a model STAR answer the user can study. Output is a structured web view + downloadable PDF. |
| **Must have (MVP)** | ✅ Yes |
| **User pain point** | Interview prep is time-consuming. Most candidates don't know what questions they'll face, and good STAR answers are hard to write without practice. Generic question banks exist but aren't tailored to the specific role or the candidate's actual experience. |
| **Complexity** | **Medium** |
| **Dependencies** | - LLM call using CV + JD context to generate questions <br> - Prompt engineering for STAR format consistency <br> - PDF generation for downloadable output |
| **Risks** | - Quality of STAR answers depends heavily on CV information density (sparse CV → generic answers) <br> - Behavioral questions require real personal experience; AI will synthesize plausible but fictional examples if CV lacks detail — this must be flagged to the user |

---

### Feature 4 — Technical Knowledge Prep (Cheat Sheet)

| Field | Detail |
|---|---|
| **What** | The AI extracts technical keywords, tools, frameworks, and concepts from the JD and generates a concise, structured cheat sheet: definitions, one-liners, "how it works" explanations, and suggested study resources. Designed to help candidates quickly fill gaps in their knowledge before an interview. |
| **Must have (MVP)** | ✅ Yes |
| **User pain point** | JDs list 15–30 required skills/technologies. Candidates don't know which ones to prioritize, what they actually mean, or where to quickly learn enough to pass a technical screen. Googling each term is slow and overwhelming. |
| **Complexity** | **Low–Medium** |
| **Dependencies** | - JD keyword extraction (NER / keyword list from LLM) <br> - LLM call to generate explanations for each keyword <br> - Simple template to render cheat sheet |
| **Risks** | - If JD is vague ("experience with modern JavaScript frameworks"), output is also vague <br> - Need a knowledge cutoff — the cheat sheet is a starting point, not a substitute for deep study |

---

### Feature 5 — Per-Job Payment (Stripe)

| Field | Detail |
|---|---|
| **What** | User pays ~49,000 VND per job submission. A "job submission" bundles: 1 tailored CV + 1 mock interview prep set + 1 technical cheat sheet. Stripe is used as the payment gateway (Vietnamese-friendly: domestic cards, QR payments, VietQR). Each purchase unlocks generation for that specific job (CV + JD pair). |
| **Must have (MVP)** | ✅ Yes |
| **User pain point** | Existing solutions (CV builders, interview prep platforms) charge monthly subscriptions. Most Vietnamese IT job seekers apply to 5–20 jobs simultaneously and don't want to commit to recurring fees for a one-time use case. Per-job pricing lowers the barrier to try. |
| **Complexity** | **Medium** |
| **Dependencies** | - Stripe account + Vietnam-supported payment methods (VND currency, Stripe Vietnam support) <br> - Backend: payment intent creation, webhook handling (payment confirmation) <br> - Database: job credit tracking per user <br> - Access control: unlock generation only after confirmed payment |
| **Risks** | - Stripe's Vietnam expansion is relatively recent; domestic card declines may be higher than mature markets <br> - Refund / dispute handling policy must be defined upfront <br> - Webhook reliability: need idempotency + retry logic |

---

## 2. User Flows

### Critical MVP Flow: Landing → Results

```
[User] → [Landing Page]
              │
              ▼
        [Signup / Login]  ←── Google OAuth (fastest) or Email+Password
              │
              ▼
        [Upload CV]  ──── ERROR: invalid file type, file > 10MB
              │
              ▼
        [Paste JD]  ──── ERROR: JD too short (<50 chars), JD too long (>10K chars)
              │
              ▼
     ┌────────┴────────┐
     │  SELECT PACKAGE   │
     │  "Apply to 1 job" │  ← One job credit = 49K VND
     └────────┬────────┘
              │
              ▼
        [Checkout — Stripe]
              │
     ┌────────┴────────┐
     │ Payment Success │ Payment Failed
     └────────┬────────┘
              │
              ▼
     ┌─────────────────────────────┐
     │  AI Processing (async)       │  ← Show: "Boosting your CV… this takes ~2 min"
     │  - Tailor CV                │
     │  - Generate Interview Q&A    │
     │  - Generate Cheat Sheet      │
     └────────────┬────────────────┘
                  │
                  ▼
     ┌─────────────────────────────┐
     │  Results Dashboard           │  ← Download tailored CV PDF
     │  - View + download all 3       │    View Interview Q&A (web + PDF)
     │  - "Apply to another job"      │    View Cheat Sheet (web + PDF)
     └─────────────────────────────┘
                  │
                  ▼
        [Email Confirmation]
        (with download links, TTL 7 days)
```

#### Decision Points

| Point | Decision | Options |
|---|---|---|
| Auth | Does user have an account? | New signup (Google/Email) or login |
| CV upload | Is file valid? | Accept PDF/DOCX only; reject corrupt files, show format error |
| JD paste | Does JD meet min quality? | Warn if <50 chars; cap at 10K chars; show word count |
| Payment | Does payment succeed? | Retry with same intent, or create new intent |
| AI processing | Does AI call fail? | Retry up to 2 times; if persistent, offer refund or manual support |

#### Error States

| State | User Message | Action |
|---|---|---|
| Unsupported file format | "Please upload a PDF or DOCX file." | Re-prompt upload |
| File too large (>10MB) | "File is too large. Please use a CV under 10MB." | Re-prompt |
| Payment declined | "Payment was declined. Please try again or use a different card." | Retry |
| JD too short | "Your JD seems too short to generate quality results. Please paste the full job description." | Allow override |
| AI generation timeout | "Generation is taking longer than expected. We'll email you when it's ready." | Email async delivery |
| Network error mid-flow | "Something went wrong. Your progress is saved — please log in to continue." | Save state to DB |

#### Confirmation Moments

1. **"Payment confirmed"** — immediate Stripe receipt + on-screen success state
2. **"Your boosted CV is ready"** — email with download links (and dashboard notification)
3. **"Good to know" tooltip** — during JD paste, explain why more JD = better results

---

## 3. Must-Have vs. Nice-to-Have

### MVP (Ship at launch)

| # | Feature | Reason to include in MVP |
|---|---|---|
| 1 | **CV Customization** | Core value proposition; the primary reason a user pays |
| 2 | **Mock Interview Q&A** | Strong complementary value from the same CV+JD inputs; almost zero extra cost to generate |
| 3 | **Technical Cheat Sheet** | Same data source (JD), same cost; high perceived value |
| 4 | **Per-job Payment (Stripe)** | Revenue mechanism; without this there's no business |
| 5 | **Landing page + Auth** | Acquisition + user identity for delivery |

### v2 (After MVP validates)

| # | Feature | Priority signal needed |
|---|---|---|
| 6 | **Company Research Report** | Add when: ≥30% of users are re-subscribing or asking "what about company research?" in feedback |
| 7 | **Multiple CV versions** | Store and manage 2+ tailored CVs for different job types |
| 8 | **Progress tracker** | "Applied / Heard Back / Interview Scheduled" per job |
| 9 | **Batch apply** | Bundle: apply to 3 jobs for 99K VND |
| 10 | **Cover letter generation** | Natural extension of CV customization |
| 11 | **WhatsApp / Zalo notification** | Vietnamese users heavily prefer these over email |
| 12 | **Interview simulator (async)** | Async video response + AI feedback |

### Considerations for deferral

- **Company Research Report** is complex not in generation but in **data freshness** — web search adds latency, cost, and reliability concerns that could jeopardize first impressions at MVP launch.
- **v2 features should be spec'd now** so architecture decisions don't block them later (e.g., user workspace should store multiple jobs even at MVP stage).

---

## 4. MVP Success Criteria

### 4.1 Payment Conversion Metrics

| Metric | Target | Notes |
|---|---|---|
| Landing page → Signup rate | > 15% | Measure with Google Analytics / Mixpanel |
| Signup → CV upload completion | > 50% | Drop-off at upload is common; need clear UX |
| CV+JD submitted → Payment initiated | > 60% | Price sensitivity test; monitor closely |
| Payment initiated → Payment confirmed | > 85% | Flag if > 15% drop — likely Stripe friction |
| **Overall funnel: Landing → Paid** | **> 5%** | Industry benchmark for paid SaaS: 2–5% |

> **Early warning**: If < 3% land-to-pay after 100 visits, revisit pricing or landing page copy before scaling.

---

### 4.2 Time to Deliver Results

| Milestone | Target SLA | Why |
|---|---|---|
| Payment confirmation → Email delivery | < 5 minutes | Keep users engaged; no timeout anxiety |
| Email delivery → All 3 deliverables ready | < 3 minutes (async) | Show "preparing" state in UI to manage expectations |
| Dashboard page load (post-payment) | < 2 seconds | Use cached/stored results, not re-generation |

> **Alert threshold**: If P95 generation time exceeds 5 minutes, investigate LLM latency or implement queuing with status polling.

---

### 4.3 Quality Indicators (Manual Review Checklist)

Every 10th completed job should be spot-checked by the team. Score each deliverable:

#### CV Customization Review

- [ ] Tailored CV contains ≥ 60% of keywords from JD
- [ ] No hallucinated job titles or companies
- [ ] Experience descriptions are factually consistent with original CV
- [ ] Tone is professional, appropriate for IT industry
- [ ] Layout renders correctly in PDF (no overlapping text, correct fonts)
- [ ] File is downloadable and opens in standard PDF readers

#### Mock Interview Q&A Review

- [ ] ≥ 5 behavioral + ≥ 5 situational questions generated
- [ ] All questions are relevant to the JD seniority level (entry/mid/senior)
- [ ] Every STAR answer has Situation, Task, Action, Result (not justTask + Action)
- [ ] STAR answers reference the candidate's actual experience from CV (not generic)
- [ ] No obviously wrong technical statements in answers

#### Technical Cheat Sheet Review

- [ ] All major technical keywords from JD are covered
- [ ] Definitions are accurate (spot-check 3 random terms)
- [ ] No hallucinated tools or frameworks that don't exist
- [ ] Format is scannable (bullet points, short explanations)
- [ ] Includes at least 1 suggested resource per major topic

#### Quality Score Threshold

> **Acceptable**: ≥ 80% of spot-checks pass all checklist items  
> **Action required**: < 80% pass rate → pause generation, investigate prompt / model, relaunch  
> **User feedback loop**: Include a "Was this helpful?" thumbs up/down on every deliverable in v1.1

---

### 4.4 Business Health Metrics

| Metric | Target | Frequency |
|---|---|---|
| Refund rate | < 5% | Weekly |
| Support ticket volume | < 10% of orders | Weekly |
| Net Promoter Score (NPS) | > 40 | After first 50 users |
| Repeat purchase rate | > 20% | Monthly |
| Monthly Active Users (MAU) | 500 by Month 3 | Monthly |
| Stripe chargeback rate | < 0.5% | Monthly |

---

## 5. Architecture Notes for MVP

```
User Flow (single request = one job credit)
──────────────────────────────────────────────
Frontend (Next.js / landing)
  │
  ├── Auth (Google OAuth) ──► Supabase Auth
  │
  ├── Upload CV ──► File ──► S3 / local storage
  │
  ├── Paste JD ──► Stored in DB (job record)
  │
  ├── Pay (Stripe Checkout) ──► Webhook ──► Update job.status = "paid"
  │
  └── After payment:
        ├── AI Queue (background job)
        │     ├── Parse CV (pdfminer / pymupdf)
        │     ├── LLM: Tailor CV → text
        │     ├── LLM: Generate Interview Q&A
        │     ├── LLM: Generate Cheat Sheet
        │     ├── Render PDFs (reportlab / weasyprint)
        │     └── Upload PDFs to storage
        │
        ├── Email (Resend / SendGrid) with download links
        │
        └── Update job.status = "done"
```

**Single AI provider**: Use OpenAI GPT-4o (fast + good at formatting) or Claude 3.5 Sonnet as the sole LLM to minimize cost complexity at MVP stage. Route all three generation tasks through one provider.

---

*Last updated: 2026-03-27*
*Author: Claude (Research Analysis for JobBoost AI MVP)*
