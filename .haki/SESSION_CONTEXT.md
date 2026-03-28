# JobBoost AI — Session handoff & continuity

> **Mục đích:** Tổng hợp bối cảnh từ `.haki` + trạng thái codebase để phiên sau (hoặc agent khác) tiếp tục không bị lệch. Cập nhật file này khi hoàn thành phase lớn hoặc đổi quyết định kiến trúc.

**Cập nhật lần cuối:** 2026-03-28 (sau Tasks 1.1 + 1.2 + 1.3 + **2.1**)

---

## 1. Sản phẩm (1 dòng)

**JobBoost AI** — SaaS giúp ứng viên IT customize CV theo JD, (sau MVP) thêm research công ty + mock interview + tech prep; ưu tiên thị trường VN, JD đa ngôn ngữ.

**Chi tiết đầy đủ:** [PROJECT.md](./PROJECT.md)

---

## 2. Nguồn sự thật & mâu thuẫn cần biết

| Chủ đề | Doc nào nói gì | Gợi ý khi làm tiếp |
|--------|----------------|---------------------|
| **Database** | `PROJECT.md` bảng tech ghi **Supabase**; `research/ARCHITECTURE.md` header ghi **Neon** | **Task 1.1** đã chốt **Supabase + client trực tiếp (không Prisma)** — ưu tiên theo [tasks/1.1.md](./tasks/1.1.md) và `PROJECT.md`. Cân nhắc sửa ARCHITECTURE header cho khớp. |
| **Monetization** | `ROADMAP.md` Phase 4 vẫn mô tả **Stripe per-job**; `tasks/1.2.md` ghi **Freemium + lead gen (3 job free), bỏ payment ở v1 landing** | Khi làm **landing / growth**, theo **1.2**. Khi làm **pipeline + Stripe**, đối chiếu lại `ROADMAP` — có thể cần một pass cập nhật ROADMAP cho đồng bộ. |
| **FEATURES.md** | Vẫn nhấn **~49k VND/job** và defer một số feature | Dùng cho ý tưởng sản phẩm; **không** coi là spec triển khai nếu đã lệch với 1.2. |

---

## 3. Cấu trúc `.haki` (đọc theo thứ tự khi vào lại)

| File | Vai trò |
|------|---------|
| [PROJECT.md](./PROJECT.md) | Vision, persona, constraints, tech table, success criteria |
| [ROADMAP.md](./ROADMAP.md) | Phase 1–5, task id, dependencies, acceptance criteria |
| [tasks/1.1.md](./tasks/1.1.md) | **Tech setup** — checklist chi tiết (Next, Clerk, Supabase, Vercel, ui-ux-pro-max) |
| [tasks/1.2.md](./tasks/1.2.md) | **Landing** — Vitest + section-by-section, freemium copy |
| [research/STACK.md](./research/STACK.md) | Phiên bản package, breaking changes, snippet tích hợp |
| [research/ARCHITECTURE.md](./research/ARCHITECTURE.md) | Luồng dữ liệu, layer — chỉnh Neon→Supabase khi refactor doc |
| [research/FEATURES.md](./research/FEATURES.md) | Phân tích feature / risk |
| [research/PITFALLS.md](./research/PITFALLS.md) | Rủi ro kỹ thuật & vận hành |
| [config.json](./config.json) | `ui_design_skill`, workflow: auto_research, tdd_first, v.v. |

---

## 4. Trạng thái roadmap (ảnh chụp)

- **Phase 1 — Task 1.1 (`tech-setup`):** ✅ **COMPLETED**
- **Phase 1 — Task 1.2 (`landing-page`):** ✅ **COMPLETED** — 32 tests pass ✅
- **Phase 1 — Task 1.3 (`data-models`):** ✅ **COMPLETED** — API routes + tests
- **Phase 2 — Task 2.1 (`cv-upload-parse`):** ✅ **COMPLETED** — 68 total tests pass ✅
- **Phase 2 — Tasks 2.2, 3, 4, 5:** ⏳ Pending

---

## 5. Trạng thái codebase (root `D:\vibe-coding-project\auto-cv`)

**Đã có (sau Tasks 1.1 + 1.2 + 1.3)**

- Tất cả trên + **API routes CRUD**:
  - `GET/POST /api/cv` — list và create CV
  - `GET/DELETE /api/cv/:id` — read và delete CV
  - `GET/POST /api/jobs` — list và create job application
  - `GET/PATCH/DELETE /api/jobs/:id` — read, update, delete job
  - Credits check khi tạo job
  - CV ownership verification
- **API test infrastructure**: `api-tests/`, `api-client.ts`, auth helper, seed data
- **Vitest test suite**: 32 component tests + 5 API tests

- `package.json`: **Next 16.2.1**, React 19, Tailwind v4 — name: `jobboost-ai`
- `middleware.ts`: Clerk v7 auth protection (async pattern, `auth().protect()`)
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx` + `sign-up`: Clerk prebuilt UI
- `app/(marketing)/page.tsx`: Landing shell (placeholder, full impl trong 1.2)
- `app/layout.tsx`: ClerkProvider wrapped, Vietnamese metadata
- `app/globals.css`: ui-ux-pro-max SaaS design tokens (Tailwind v4 @theme block)
- `lib/supabase.ts` + `lib/supabase/server.ts`: Factory pattern (tránh build-time env errors)
- `lib/types.ts`: Database types (Profile, CV, JobApplication, JobResult)
- `supabase/migrations/001_initial_schema.sql`: Full schema + RLS policies
- `app/api/webhooks/clerk/route.ts`: Clerk webhook → auto-create profile
- `.env.example`: Template đầy đủ env vars

**Chưa có**

- Step 3 (Vercel deploy): Chưa push GitHub, chưa deploy Vercel, chưa tạo vercel.json
- Clerk JWT template setup trong Supabase (để RLS `current_user_id()` hoạt động)
- Supabase Storage bucket cho CV files (tạo bằng tay trong Dashboard)
- `.env.local` thực tế (credentials)
- GitHub repo remote chưa set

**Tech decisions đã thực hiện**

- Supabase factory pattern: `createSupabaseAdmin()` / `createSupabaseClient()` — gọi trong handler không ở module scope
- Clerk v7 middleware: `async (auth, req)` + `await (auth() as any).protect()`
- `svix` package: Clerk webhook signature verification
- **`lib/auth.ts`**: `getServerUserId()` helper — consistent auth cho tất cả API routes
- **`pdf-parse`**: lazy-load pattern với `require()` — tránh jsdom + ESM conflicts
- **`mammoth`**: dynamic import cho DOCX parsing
- **Claude 3.5 Sonnet**: AI structured CV extraction với 30s timeout + confidence scoring

**Ghi chú workflow**

- [CLAUDE.md](../CLAUDE.md) yêu cầu đọc `AGENTS.md` trong repo — **ở root chưa có** `AGENTS.md` (chỉ có trong `scaffold-temp` / template).
- Build pass ✅ với `pnpm build`
- Warning về workspace root (pnpm-workspace.yaml) và middleware convention (Next.js 16 khuyên dùng `proxy`)

---

## 6. Việc nên làm tiếp theo (thứ tự gợi ý)

1. **Setup Clerk JWT template** trong Supabase Dashboard → Authentication → JWT Templates → Clerk
2. **Tạo Supabase Storage bucket** `cvs` trong Dashboard → Storage
3. **Copy `.env.example` → `.env.local`** + điền credentials thật
4. **Push GitHub** + **Deploy Vercel** + add env vars trong Vercel dashboard
5. **Bắt đầu Task 1.3** (Core Data Models — Supabase schema đã có trong `supabase/migrations/`)

---

## 7. Cách mở session mới (prompt mẫu)

Dán vào chat mới:

```text
Dự án: JobBoost AI, repo auto-cv. Đọc trước:
- .haki/SESSION_CONTEXT.md (handoff)
- .haki/ROADMAP.md
- .haki/tasks/1.1.md (đang làm dở)

Tiếp tục implement theo checklist 1.1; không mở rộng scope sang 1.2 trừ khi 1.1 acceptance criteria xong.
```

Nếu dùng haki CLI/skill: theo [CLAUDE.md](../CLAUDE.md) — `/haki:next` sau khi `AGENTS.md` đã rõ ràng ở root.

---

## 8. Open questions (từ PROJECT.md — chưa đóng)

- Single vs multi AI provider; thời gian lưu CV; giới hạn upload free; ngôn ngữ output (auto vs user chọn).

---

*Tệp này là bản tổng hợp; chi tiết implementation luôn lấy từ `tasks/*.md` và code thực tế.*
