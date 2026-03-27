# JobBoost AI — Session handoff & continuity

> **Mục đích:** Tổng hợp bối cảnh từ `.haki` + trạng thái codebase để phiên sau (hoặc agent khác) tiếp tục không bị lệch. Cập nhật file này khi hoàn thành phase lớn hoặc đổi quyết định kiến trúc.

**Cập nhật lần cuối:** 2026-03-27 (theo trạng thái repo tại thời điểm tổng hợp)

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

- **Phase 1 — Task 1.1 (`tech-setup`):** Trên giấy là **In Progress**. Thực tế code mới ở mức **scaffold sớm** (xem §5).
- **Task 1.2 (`landing-page`):** **Planned** — chưa bắt đầu trong codebase.
- **1.3 trở đi:** Pending, phụ thuộc 1.1.

---

## 5. Trạng thái codebase (root `/Users/admin/Desktop/auto-cv`)

**Đã có**

- `package.json`: **Next 16.2.1**, React 19, Tailwind v4, deps đã khai báo `@clerk/nextjs`, `@supabase/supabase-js`, `stripe`, `resend` — **chưa thấy import/sử dụng trong source**.
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`: vẫn gần như **template create-next-app** (metadata “Create Next App”, hero mặc định).
- Thư mục `scaffold-temp/`: bản scaffold phụ (có `AGENTS.md` riêng) — **không** coi là app chính trừ khi bạn chủ động merge.

**Chưa có (theo Task 1.1)**

- `middleware.ts` (Clerk)
- `app/(auth)/sign-in`, `sign-up`, route group `(marketing)`
- `lib/supabase.ts`, `lib/supabase/server.ts`, `lib/types.ts`
- `supabase/migrations/*.sql`, RLS
- `.env.example` / `.env.local` (không track trong repo hiện tại)
- `vercel.json`, deploy GitHub/Vercel
- Áp dụng **ui-ux-pro-max** tokens / font theo skill (bước 4 task 1.1)
- `package.json` **name** vẫn là `scaffold-temp` — nên đổi thành tên dự án (vd. `jobboost-ai`) khi chỉnh project identity

**Ghi chú workflow**

- [CLAUDE.md](../CLAUDE.md) yêu cầu đọc `AGENTS.md` trong repo — **ở root chưa có** `AGENTS.md` (chỉ có trong `scaffold-temp` / template). Nên thêm `AGENTS.md` ở root hoặc trỏ rõ đường dẫn thật để agent không lạc.

---

## 6. Việc nên làm tiếp theo (thứ tự gợi ý)

1. **Hoàn tất Task 1.1** theo [tasks/1.1.md](./tasks/1.1.md): cấu trúc route, Clerk, Supabase helpers, migration, `.env.example`, đổi `package.json` name.
2. **Verify:** `pnpm dev`, sign-in/up, (sau khi có DB) smoke test Supabase.
3. **Deploy Vercel** + env vars.
4. **Bước design system** (1.1 step 4) → shell marketing.
5. **Bắt đầu Task 1.2** (Vitest + landing sections).

Sau mỗi chunk lớn: điền bảng **Implementation Details** / **Execution Results** trong `tasks/1.1.md` (hiện đang trống template).

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
