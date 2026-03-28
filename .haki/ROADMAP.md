# JobBoost AI — Roadmap

## Phase 1: Foundation & Landing

### Task 1.1: Tech Setup (`tech-setup`)
**Status:** ✅ Completed (2026-03-27)

**Requirements:**
- Initialize Next.js project với App Router + TypeScript
- Setup Tailwind CSS + ui-ux-pro-max design system
- Setup PostgreSQL (Neon) database schema
- Setup Clerk authentication
- Deploy lên Vercel, verify CI/CD

**Acceptance Criteria:**
- [ ] Next.js app chạy trên Vercel
- [ ] Database connected, migrations chạy OK
- [ ] User có thể sign up/sign in qua Clerk
- [ ] Design system applied (ui-ux-pro-max)

---

### Task 1.2: Landing Page (`landing-page`)
**Status:** ✅ Completed (2026-03-27)

**Requirements:**
- Hero section: headline + subheadline về giá trị (free + fast)
- How it works: 3-step flow (upload CV → paste JD → nhận kết quả)
- Features section: 4 deliverables (CV + Research + Interview + Tech Prep)
- Social proof: stats (e.g., "500+ IT professionals")
- FAQ section: 5 questions (free?, privacy, format support, etc.)
- Lead capture CTA: "Bắt đầu miễn phí" → signup (no payment)

**Acceptance Criteria:**
- [ ] Landing page responsive (mobile-first)
- [ ] SEO meta tags (title, description, OG image)
- [ ] CTA button → signup flow hoạt động
- [ ] Free + signup CTA hiển thị rõ ràng (không cần payment)

---

### Task 1.3: Core Data Models (`data-models`)
**Status:** ✅ Completed (2026-03-28)

**Requirements:**
- User model (Clerk user → profile)
- CV model (file, parsed_text, structured_data JSON, uploaded_at)
- JobApplication model (user_id, cv_id, jd_text, jd_url, status, paid_at)
- JobResult model (application_id, cv_customized_path, company_report, mock_interview, tech_prep)

**Acceptance Criteria:**
- [ ] All models migrated in Neon PostgreSQL
- [ ] API routes CRUD cho CV và JobApplication

---

## Phase 2: CV Pipeline

### Task 2.1: CV Upload & Parse (`cv-upload-parse`)
**Status:** ✅ Completed (2026-03-28) | **Priority:** 1 | **Dependencies:** Task 1.3

**Requirements:**
- Upload CV (PDF/Word) lên S3 hoặc local storage
- Parse CV text (pdf-parse cho PDF, mammoth cho DOCX)
- Extract structured data: name, email, phone, skills, experience, education
- Display parsed preview cho user verify

**Acceptance Criteria:**
- [ ] Upload PDF/DOCX thành công
- [ ] Parsed text hiển thị đúng
- [ ] Structured fields extracted (name, skills, experience)
- [ ] File size limit: 10MB

---

### Task 2.2: JD Input & Analysis (`jd-input-analysis`)
**Status:** ⏳ Pending | **Priority:** 1 | **Dependencies:** Task 1.3

**Requirements:**
- Input: paste JD text hoặc paste job URL (scrape JD)
- Extract: required skills, job title, company name, responsibilities, requirements
- Match score: so sánh CV skills vs JD requirements (%)
- Display match analysis cho user trước khi trả phí

**Acceptance Criteria:**
- [ ] Paste JD text → parsed và hiển thị key requirements
- [ ] Match score CV-JD calculated và displayed
- [ ] URL scraping cho 1 số site phổ biến (optional v1)

---

## Phase 3: AI Generation

### Task 3.1: CV Customization (`cv-customization`)
**Status:** ⏳ Pending | **Priority:** 1 | **Dependencies:** Task 2.1, Task 2.2

**Requirements:**
- AI prompt: rewrite CV bullet points để match JD keywords
- Preserve original experience/education, chỉ adjust wording
- Generate customized CV as structured data
- Render thành PDF (React-PDF)
- Download link sau khi complete

**Acceptance Criteria:**
- [ ] AI customize CV theo JD keywords
- [ ] Output PDF đẹp, professional, download được
- [ ] Processing time < 30 giây

---

### Task 3.2: Company Research (`company-research`)
**Status:** ⏳ Pending | **Priority:** 2 | **Dependencies:** Task 2.2

**Requirements:**
- Extract company name từ JD
- Web search/crawl: company website, LinkedIn, Glassdoor, Vietnamese news
- Generate report gồm: company overview, culture, products/services, recent news, interview tips specific

**Acceptance Criteria:**
- [ ] Report generated từ 3+ sources
- [ ] Sections: Overview, Culture, Products, News, Interview Tips
- [ ] Word count: 500-1000 words
- [ ] References/sources cited

---

### Task 3.3: Mock Interview Questions (`mock-interview`)
**Status:** ⏳ Pending | **Priority:** 2 | **Dependencies:** Task 2.2

**Requirements:**
- Generate behavioral questions (STAR format) từ JD
- Generate situational questions phù hợp job level
- Suggested answers/frameworks cho mỗi question
- Categorize: Behavioral, Situational, "Why this company?"

**Acceptance Criteria:**
- [ ] 10-15 questions generated
- [ ] Mỗi question có suggested answer (150-300 words)
- [ ] STAR format for behavioral questions

---

### Task 3.4: Technical Knowledge Prep (`tech-prep`)
**Status:** ⏳ Pending | **Priority:** 2 | **Dependencies:** Task 2.2

**Requirements:**
- Extract technical keywords từ JD (Python, React, AWS, Docker...)
- Generate "cheat sheet": key concepts cần ôn cho mỗi tech
- Prioritize by JD frequency (keywords xuất hiện nhiều = quan trọng hơn)
- Include: definition + practical examples + common interview questions

**Acceptance Criteria:**
- [ ] Top 10-15 tech topics extracted
- [ ] Mỗi topic có: definition, example, interview Q
- [ ] Ordered by relevance (JD match %)

---

## Phase 4: Payments & Delivery

### Task 4.1: Stripe Integration (`stripe-integration`)
**Status:** ⏳ Pending | **Priority:** 1 | **Dependencies:** Task 2.2

**Requirements:**
- Stripe Checkout cho per-job payment
- Price: configurable (VD: 49K VND)
- Webhook: xử lý payment success → unlock results
- Store payment record trong database

**Acceptance Criteria:**
- [ ] Checkout flow hoạt động
- [ ] Webhook fires, result unlocked
- [ ] Payment history visible trong user dashboard

---

### Task 4.2: Email Delivery (`email-delivery`)
**Status:** ⏳ Pending | **Priority:** 1 | **Dependencies:** Task 4.1

**Requirements:**
- Resend integration
- Email template: summary + download links (CV PDF, reports)
- Trigger: automatic sau payment success
- Retry logic nếu send fail

**Acceptance Criteria:**
- [ ] Email sent within 5 phút after payment
- [ ] Contains all deliverables (CV, reports, Q&A)
- [ ] User can resend email from dashboard

---

### Task 4.3: User Dashboard (`user-dashboard`)
**Status:** ⏳ Pending | **Priority:** 2 | **Dependencies:** Task 4.1

**Requirements:**
- List of past job applications
- Status per application (pending payment, processing, completed)
- Download results
- Profile: uploaded CVs, usage count

**Acceptance Criteria:**
- [ ] Dashboard hiển thị all applications
- [ ] Download/view results works
- [ ] Mobile responsive

---

## Phase 5: Launch

### Task 5.1: Testing & QA (`testing-qa`)
**Status:** ⏳ Pending | **Priority:** 1 | **Dependencies:** Tasks 3.1-4.3

**Requirements:**
- End-to-end test: signup → upload CV → paste JD → pay → receive email
- Test với 5+ JD mẫu (IT jobs: frontend, backend, DevOps)
- Test với CV formats: PDF, DOCX
- Performance: processing time < 5 phút cho full pipeline

**Acceptance Criteria:**
- [ ] E2E flow pass không lỗi
- [ ] AI output quality acceptable (manual review)
- [ ] Error handling graceful (không crash)

---

### Task 5.2: SEO & Analytics (`seo-analytics`)
**Status:** ⏳ Pending | **Priority:** 2 | **Dependencies:** Task 1.2

**Requirements:**
- Google Search Console setup
- Analytics: page views, conversion rate, funnel drop-off
- Stripe dashboard monitoring
- Sitemap.xml, robots.txt

**Acceptance Criteria:**
- [ ] Analytics tracking all key events
- [ ] SEO: index ổn, no crawl errors
- [ ] Dashboard metrics visible

---

### Task 5.3: Soft Launch (`soft-launch`)
**Status:** ⏳ Pending | **Priority:** 1 | **Dependencies:** Task 5.1

**Requirements:**
- Deploy to production
- Share on social channels (LinkedIn, Vietnamese tech communities)
- Collect feedback từ 10-20 early users
- Fix critical bugs

**Acceptance Criteria:**
- [ ] Production URL accessible
- [ ] First 10+ paying users
- [ ] Feedback loop established

---

## Open Decisions for Discussion

| Task              | Question                                                  | Options                           |
| ---------------- | -------------------------------------------------------- | --------------------------------- |
| Task 3.1         | Single AI provider hay multi-provider?                  | Anthropic / OpenAI / Both       |
| Task 3.2-3.4     | Output language                                          | Auto-detect / User chọn          |
| Task 2.1          | CV storage duration                                      | Delete after 7 days / Keep 30 days |
| Task 4.1          | Payment currency                                         | VND (Stripe Vietnam) / USD      |
| Task 3.1          | CV PDF template design                                   | Minimalist / Professional / Modern |
