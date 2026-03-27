# JobBoost AI — CV Customization SaaS

## Vision

Một nền tảng SaaS giúp ứng viên tự động customize CV theo Job Description (JD), nghiên cứu công ty, và chuẩn bị phỏng vấn — tất cả chỉ trong vài phút sau khi trả phí per-job.

**Luồng người dùng cốt lõi:**

1. Ứng viên upload CV (PDF/Word) → hệ thống parse ra structured data
2. Ứng viên paste/link JD thủ công
3. Trả phí per-job
4. Nhận về: CV đã customize (PDF) + Company Research Report + Mock Interview Q&A + Technical Knowledge Prep

**Giá trị cốt lõi:** Tiết kiệm 2-4 giờ chuẩn bị mỗi job application, tăng tỷ lệ pass phỏng vấn.

## Target Users

**Primary:** Ứng viên IT/Software Engineer ở Việt Nam (hoặc remote globally) đang apply nhiều job cùng lúc.

**Secondary:**
- Fresh grads cần hướng dẫn phỏng vấn
- Người chuyển nghề cần định hướng

**User persona mặc định:** Tự tin về technical nhưng mệt mỏi với việc customize CV thủ công cho từng job.

## Constraints

- **Privacy:** CV của ứng viên chứa dữ liệu nhạy cảm → cân nhắc encryption, không lưu lâu
- **MVP:** Landing page đơn giản, thanh toán Stripe, không cần auth phức tạp ở v1
- **Language:** JD có thể là tiếng Việt hoặc tiếng Anh → hệ thống phải xử lý multilingual
- **Scope v1:** Chỉ paste/link JD thủ công (job board integration để v2)

## Key Decisions

| Decision        | Choice                       | Rationale                                                       |
| --------------- | ---------------------------- | ---------------------------------------------------------------- |
| Pricing Model   | Freemium + Lead Gen (B2B)  | Build user base first → B2B revenue later                       |
| User Value      | Full package free (3 job)    | Tạo habit, thu data, conversion later                            |
| Signup Gate     | Required (để thu data)     | Email/name/tech skills = lead data cho B2B                    |
| Primary User    | IT job seekers               | Tech-savvy, sẵn sàng dùng tool miễn phí, JD có cấu trúc     |
| MVP Scope       | CV + Research + Interview   | Full package tạo giá trị rõ ràng, không phân tán                 |
| Landing Page    | Template/copy nhanh          | Ưu tiên chức năng > đẹp, tới market sớm                        |

## Tech Stack

| Layer          | Tech                           | Notes                                                       |
| -------------- | ------------------------------ | ----------------------------------------------------------- |
| **Frontend**    | Next.js (App Router)            | SSR/SSG tốt cho landing + app, deploy Vercel              |
| **Package Mgr** | pnpm                             | Fast, disk efficient, ecosystem stable                      |
| **UI**         | Tailwind v4 + ui-ux-pro-max    | Design system với 50 styles, rapid UI development           |
| **AI Backend** | Single provider (Claude/GPT)   | Đơn giản, rẻ, MVP không cần multi-provider complexity      |
| **PDF Parse**  | pdf-parse / docx-parser       | Extract CV text từ PDF/Word                                 |
| **PDF Generate**| pdf-lib (server-side)            | Vietnamese font embedding, verified v1.17                   |
| **DB**         | Supabase (PostgreSQL)            | Serverless, free tier đủ cho MVP, Supabase client trực tiếp |
| **Auth**        | Clerk                          | UI components có sẵn, webhook tích hợp, free tier 10K MAUs |
| **Payments**   | Stripe Checkout                 | Per-job payment, webhook để unlock kết quả                 |
| **Email**       | Resend                         | Gửi kết quả cho user qua email sau payment               |
| **Hosting**    | Vercel + GitHub                | Full-stack Next.js deployment, CI/CD auto-deploy           |

## Out of Scope (v1)

- Job board integration (LinkedIn, Vietnamworks, CareerViet) → **v2**
- Multi-user dashboard để quản lý nhiều CV
- Resume builder từ đầu (chỉ customize CV có sẵn)
- Interview scheduling / calendar integration
- ATS integration
- Referral/affiliate system
- Mobile app

## Success Criteria (v1)

- Landing page online với Stripe payment
- User upload CV → paste JD → trả phí → nhận kết quả qua email trong <5 phút
- Tỷ lệ hoàn thành payment > 2%
- User upload CV (không chỉ đọc landing) > 100 user/month

## Open Questions

| Question                                        | Status      | Notes                              |
| ----------------------------------------------- | ----------- | ---------------------------------- |
| Single AI provider hay multi-provider?           | **Open**   | Cần thêm context về chi phí/th quality |
| Lưu CV trên server bao lâu?                   | **Open**   | Privacy vs UX tradeoff             |
| Hạn chế số lần CV upload free?                 | **Open**   | Freemium trigger hay pay-per-use?   |
| Output language: tự động detect hay user chọn?   | **Open**   | Ảnh hưởng prompt engineering      |
