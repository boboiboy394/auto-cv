# JobBoost AI — Tech Stack (Context7-verified)

> ⚠️ **Note:** Context7 MCP was not available in this session. Versions verified via `npm view @latest` and WebSearch (March 27, 2026). Always run `npm view <pkg> version` before installing.

---

## Next.js — v16.2.1
- **Source:** npm `next@latest` · [nextjs.org](https://nextjs.org)
- **Install:** `bun add next@^16.2.1 react@^19 react-dom@^19`
- **Key config:** `next.config.ts` (TypeScript), App Router default, Turbopack default in dev
- **Breaking changes from v15:**
  - `fetch()` — `no-store` is now the **default** (was `force-cache`); explicitly opt-in with `cache: 'force-cache'`
  - Route Handler `Response` caching requires `export const dynamic = 'force-static'`
  - `next/image` — `unoptimized` prop removed; use `loading="lazy"` instead
  - `next/font` — Google Fonts API key may be required for some fonts
  - Turbopack is stable and the default dev server (no `--turbopack` flag needed)
- **Peer deps:** React 19 (required), Node.js 18.17+
- **Notes:** Next.js 16 ships with React 19 and is production-stable. Use `bunx create-next-app@latest` for scaffolding. The App Router is fully mature — Pages Router is in maintenance mode.

---

## Stripe Checkout + Webhooks — v21.0.1
- **Source:** npm `stripe@latest` · [stripe.com/docs](https://stripe.com/docs)
- **Install:** `bun add stripe`
- **Key config:**
  ```ts
  // lib/stripe.ts
  import Stripe from 'stripe'
  export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',  // latest API version — update on upgrade
  })
  ```
- **Breaking changes:**
  - API versions change with each major Stripe release; the `apiVersion` string must be kept current
  - Node.js 16+ required (use runtime adapter for Edge/Serverless)
  - `stripe.balance.retrieve()` response shape changed in v20+
  - Webhook signature verification: `stripe.webhooks.constructEventAsync` deprecated — use `stripe.webhooks.constructEvent` (sync)
- **Webhook handler pattern (Next.js App Router):**
  ```ts
  // app/api/webhooks/stripe/route.ts
  import { stripe } from '@/lib/stripe'
  import { NextRequest, NextResponse } from 'next/server'

  export async function POST(req: NextRequest) {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }
    switch (event.type) {
      case 'checkout.session.completed':
        // Unlock job credits / grant access
        break
      case 'payment_intent.payment_failed':
        // Notify user
        break
    }
    return NextResponse.json({ received: true })
  }
  ```
- **Notes:** For per-job payments, Stripe Checkout (hosted page) is ideal. Set `payment_intent_data.metadata.jobBoost_jobId` to track which job the payment is for. Webhooks must be registered in the Stripe Dashboard.

---

## Resend (email) — v7.5.0
- **Source:** npm `resend@latest` · [resend.com/docs](https://resend.com/docs)
- **Install:** `bun add resend`
- **Key config:**
  ```ts
  // lib/email.ts
  import { Resend } from 'resend'
  const resend = new Resend(process.env.RESEND_API_KEY)
  ```
- **Breaking changes:** Minimal. v3→v4 changed the client constructor signature; v7 is stable.
- **Transactional email pattern:**
  ```ts
  import { Resend } from 'resend'
  import { JobBoostReport } from '@/components/emails/JobBoostReport'  // React Email component

  const { data, error } = await resend.emails.send({
    from: 'JobBoost AI <hello@jobboost.ai>',
    to: user.email,
    subject: `Your JobBoost Report: ${jobTitle} at ${company}`,
    react: <JobBoostReport userName={user.name} downloadUrl={reportUrl} />,
  })
  ```
- **Notes:** Use [React Email](https://react.email) for beautiful, code-driven email templates. Works perfectly with Next.js Server Actions and edge runtime. Free tier: 3,000 emails/day.

---

## PDF Parsing — `pdf-parse` — v2.4.5
- **Source:** npm `pdf-parse@latest` · [npm](https://www.npmjs.com/package/pdf-parse)
- **Install:** `bun add pdf-parse`
- **Key config:** Pure JS, no native deps. Works in Node.js and edge runtimes (with caveats — no canvas).
- **Breaking changes:** None significant; v1.1.1 was the legacy version; v2.x rewrote internals for better compatibility with compressed PDFs.
- **Usage:**
  ```ts
  import pdfParse from 'pdf-parse'
  const { text, metadata, numberOfPages } = await pdfParse(fileBuffer)
  ```
- **Notes:** ✅ Great for extracting CV text. ⚠️ Does not preserve layout — use for raw text extraction only. For complex layouts, consider `pdfjs-dist` (Mozilla PDF.js server build).

---

## PDF Generation — `pdf-lib` — v1.17.1
- **Source:** npm `pdf-lib@latest` · [pdf-lib](https://pdf-lib.org)
- **Install:** `bun add pdf-lib`
- **Key config:** Zero native dependencies. Pure TypeScript. Works in all JS environments.
- **Breaking changes:** v1.x is stable; no major breaking changes in recent releases.
- **Usage:**
  ```ts
  import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])  // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  page.drawText('JobBoost AI — Technical Cheat Sheet', { x: 50, y: 750, size: 24, font, color: rgb(0, 0, 0) })
  const pdfBytes = await pdfDoc.save()
  ```
- **Notes:** ✅ Best for programmatic PDF creation (cheat sheets, reports). Combine with `pdf-parse` to read CV + generate a reformatted output. Supports embedding custom fonts (Vietnamese font: embed `.ttf`/`.otf`).

---

## React-PDF (`@react-pdf/renderer`) — v4.3.2
- **Source:** npm `@react-pdf/renderer@latest` · [react-pdf.org](https://react-pdf.org)
- **Install:** `bun add @react-pdf/renderer`
- **Key config:** React-based PDF generation. Renders to `PDFDownloadLink` or `renderToStream`.
- **Breaking changes:**
  - v3→v4 changed the font embedding API — custom fonts now use `<Font register={...} />` instead of `Font.register()`
  - Stylesheet API updated for v4; check migration guide
- **Usage:**
  ```tsx
  // components/pdfs/InterviewGuidePDF.tsx
  import { Document, Page, Text, StyleSheet, Font } from '@react-pdf/renderer'
  import { createElement } from 'react'
  Font.register({ family: 'Inter', src: '/fonts/Inter.ttf' })

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Inter' },
    title: { fontSize: 24, marginBottom: 20 },
    section: { fontSize: 14, marginTop: 12 },
  })

  export function InterviewGuidePDF({ questions }: { questions: string[] }) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Mock Interview Q&A</Text>
          {questions.map((q, i) => (
            <Text key={i} style={styles.section}>Q{i + 1}: {q}</Text>
          ))}
        </Page>
      </Document>
    )
  }
  ```
- **Notes:** ⚠️ **Vietnamese font caveat** — React-PDF does not natively support variable fonts or RTL. For Vietnamese diacritics, you must embed a font that covers the Vietnamese Unicode range (e.g., Noto Sans, Roboto, or a Google Fonts `.ttf`). Test output carefully. For more reliable PDF output, consider `pdf-lib` with a server-side render pipeline.

---

## Clerk Authentication — v7.0.7
- **Source:** npm `@clerk/nextjs@latest` · [clerk.com](https://clerk.com)
- **Install:** `bun add @clerk/nextjs`
- **Key config:**
  ```ts
  // middleware.ts
  import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
  const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
  export default clerkMiddleware((auth, req) => {
    if (isProtectedRoute(req)) auth().protect()
  })
  export const config = { matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'] }
  ```
  ```tsx
  // app/layout.tsx (wrap root layout)
  import { ClerkProvider } from '@clerk/nextjs'
  ```
- **Breaking changes:**
  - v5→v6+: Middleware API changed — `auth().protect()` replaces `authMiddleware` redirects
  - `publishableKey` env var renamed from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to `PUBLIC_CLERK_KEY` in v6 (backwards-compatible alias still works)
  - `<SignIn>` / `<SignUp>` components moved from `@clerk/nextjs` to `@clerk/react`
- **Notes:** ✅ Best DX for SaaS. Free up to 10,000 MAUs. Built-in org management, OAuth, magic links. Works great with Next.js App Router and React Server Components.

---

## Auth.js / NextAuth v5 — `@auth/nextjs-adapter` — v1.0.2
- **Source:** npm `@auth/nextjs-adapter@latest` · [authjs.dev](https://authjs.dev)
- **Install:** `bun add @auth/core @auth/nextjs-adapter`
- **Key config:**
  ```ts
  // auth.ts (root)
  import NextAuth from '@auth/nextjs-adapter'
  export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: yourDatabaseAdapter,
    providers: [
      // Google, GitHub, Email (Resend), Credentials, etc.
    ],
    secret: process.env.AUTH_SECRET,
  })
  ```
  ```ts
  // app/api/auth/[...nextauth]/route.ts
  export { GET, POST } from '@auth/nextjs-adapter'
  ```
- **Breaking changes:**
  - v4→v5: Full API rewrite. `pages/api/auth/[...nextauth].ts` replaced by `auth.ts` + App Router routes
  - `useSession()` hook deprecated; use `auth()` server function or `useAuth` from `@auth/core`
  - Providers now imported from `@auth/core` (not `@next-auth/providers-*`)
- **Notes:** ⚠️ **Clerk is recommended for JobBoost** — it provides hosted UI, webhook syncing, and user management out of the box. Auth.js is better if you want full control and zero-vendor lock-in. Both work with Next.js App Router.

---

## Neon PostgreSQL + Prisma — Prisma v7.5.0, `@neondatabase/serverless` v4.3.2
- **Source:** npm `prisma@latest`, `@neondatabase/serverless@latest`
- **Install:**
  ```bash
  bun add prisma @prisma/client @neondatabase/serverless @prisma/adapter-neon
  bunx prisma init
  ```
- **Key config — Prisma schema:**
  ```prisma
  // prisma/schema.prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
  }
  generator client {
    provider = "prisma-client-js"
  }
  model User {
    id            String   @id @default(cuid())
    email         String   @unique
    name          String?
    stripeCustomerId String? @unique
    credits       Int      @default(3)
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
  }
  model Payment {
    id                String   @id @default(cuid())
    userId            String
    stripeSessionId   String   @unique
    stripePaymentIntent String?
    jobId             String?
    amount            Int      // cents
    creditsPurchased  Int
    status            String   // succeeded, pending, failed
    createdAt         DateTime @default(now())
  }
  ```
- **Neon connection (serverless driver — replaces Data Proxy):**
  ```ts
  // lib/db.ts
  import { neon } from '@neondatabase/serverless'
  import { PrismaNeon } from '@prisma/adapter-neon'
  import { PrismaClient } from '@prisma/client'

  const sql = neon(process.env.DATABASE_URL!)
  const adapter = new PrismaNeon(sql)
  export const db = new PrismaClient({ adapter })
  ```
- **Breaking changes:**
  - Prisma v6+: `driverAdapters` preview feature is **GA** — no longer need `previewFeatures = ["driverAdapters"]`
  - Neon Data Proxy **fully deprecated end of 2025** — all new projects must use `@neondatabase/serverless` + `@prisma/adapter-neon`
  - Prisma v7: Connection handling changed; `prisma.$connect()` / `prisma.$disconnect()` behavior updated
  - Prisma v5→v6 migration: drop `previewFeatures = ["driverAdapters"]` in schema.prisma
- **Notes:** ✅ Neon free tier is generous (0.5 GB RAM, 0.5 GB storage, 1 branch). Prisma Migrate works with Neon write branches for CI/CD. Connection pooling is handled by the HTTP-based serverless driver — no separate pooler needed.

---

## Tailwind CSS v4 — v4.2.2
- **Source:** npm `tailwindcss@latest` · [tailwindcss.com](https://tailwindcss.com)
- **Install:**
  ```bash
  bunx create-next-app@latest --tailwind  # auto-configures v4 with Next.js 16
  # Or manually:
  bun add tailwindcss@^4 @tailwindcss/postcss @tailwindcss/forms
  ```
- **Key config — v4 uses CSS-first configuration (no `tailwind.config.ts`):**
  ```css
  /* app/app.css */
  @import "tailwindcss";

  @theme {
    --color-brand-50: #eff6ff;
    --color-brand-500: #3b82f6;
    --color-brand-600: #2563eb;
    --font-sans: 'Inter', sans-serif;
  }
  ```
- **Breaking changes from v3:**
  - `tailwind.config.ts` replaced by `@theme {}` block in CSS
  - `content: []` glob patterns no longer needed — v4 scans automatically
  - Many utility classes renamed/removed (e.g., `text-opacity-*` → `text-black/50` opacity syntax)
  - `tailwindcss/forms` plugin must be installed separately: `bun add @tailwindcss/forms`
  - `@apply` with arbitrary values changed syntax
- **Notes:** ⚠️ If starting fresh, use v4. If migrating a v3 project, budget 1–2 days for the config rewrite. The `@tailwindcss/postcss` plugin (not `autoprefixer`) must be registered in `postcss.config.mjs`.

---

## AI Layer: Anthropic Claude vs OpenAI GPT

### Anthropic Claude API — `@anthropic-ai/sdk` v1.0.2
- **Install:** `bun add @anthropic-ai/sdk`
- **Key model for JobBoost:** `claude-3-5-sonnet-20241022` (fast, cost-efficient, 200K context)
- **Pricing (as of March 2026):**
  | Model | Input | Output |
  |---|---|---|
  | Claude 3.5 Sonnet | ~$3/M tok | ~$15/M tok |
  | Claude 3 Opus | ~$15/M tok | ~$75/M tok |
- **Usage:**
  ```ts
  import Anthropic from '@anthropic-ai/sdk'
  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: 'You are a Vietnamese career coach...',
    messages: [{ role: 'user', content: prompt }],
  })
  ```
- **Vietnamese support:** ⭐⭐⭐ Excellent. Claude 3.5 Sonnet handles Vietnamese nuances, formal register, diacritical marks, and idioms very well. Best-in-class for nuanced language tasks.

### OpenAI API — `openai` v6.33.0
- **Install:** `bun add openai`
- **Key model for JobBoost:** `gpt-4o` (multimodal, 128K context) or `gpt-4o-mini` (cheaper)
- **Pricing (as of March 2026):**
  | Model | Input | Output |
  |---|---|---|
  | GPT-4o | ~$2.5/M tok | ~$10/M tok |
  | GPT-4o-mini | ~$0.15/M tok | ~$0.60/M tok |
- **Vietnamese support:** ⭐⭐⭐ Very good. Strong multilingual training, handles code-mixed Vietnamese well. Slight edge on creative writing.

### 🇻🇳 Recommendation for JobBoost AI

| Task | Recommended AI | Reason |
|---|---|---|
| CV tailoring (JD matching) | **Claude 3.5 Sonnet** | Superior understanding of nuance; better at aligning soft skills with JD keywords |
| Company research report | **Claude 3.5 Sonnet** | Longer context window (200K) — can ingest more source material |
| Mock interview Q&A | **GPT-4o** | Slightly better at generating varied, creative questions |
| Technical cheat sheet | **Claude 3.5 Sonnet** | Better at structured technical explanations |
| Vietnamese language quality | **Claude 3.5 Sonnet** (slight edge) | Better formal/informal register, idioms |
| Cost efficiency | **GPT-4o-mini** for high volume | ~20× cheaper than Claude Sonnet for simple tasks |
| **Balanced approach** | **Claude 3.5 Sonnet** + fallback to **GPT-4o-mini** | Use routing middleware to pick model per task |

> **Architecture:** Consider a lightweight AI router abstraction (`lib/ai/index.ts`) so you can switch models without rewriting prompts. Both SDKs follow similar patterns.

---

## Summary: Recommended Stack for JobBoost AI

| Category | Recommended Choice | Version |
|---|---|---|
| Framework | **Next.js** | 16.2.1 |
| Styling | **Tailwind CSS v4** | 4.2.2 |
| Auth | **Clerk** (preferred) | 7.0.7 |
| Database | **Neon PostgreSQL** + **Prisma** | 7.5.0 |
| Payments | **Stripe Checkout + Webhooks** | 21.0.1 |
| Email | **Resend** + React Email | 7.5.0 |
| PDF Input | **pdf-parse** | 2.4.5 |
| PDF Output | **pdf-lib** (server-side) | 1.17.1 |
| AI (primary) | **Claude 3.5 Sonnet** (`@anthropic-ai/sdk`) | 1.0.2 |
| AI (cost-efficient) | **GPT-4o-mini** (`openai`) | 6.33.0 |

---

## Sources
- [nextjs.org/blog/next-15](https://nextjs.org/blog/next-15) · [nextjs.org/docs/app](https://nextjs.org/docs/app)
- [stripe.com/docs](https://stripe.com/docs)
- [resend.com/docs](https://resend.com/docs)
- [clerk.com/docs](https://clerk.com/docs)
- [authjs.dev](https://authjs.dev)
- [neon.tech/docs](https://neon.tech/docs)
- [prisma.io/docs](https://prisma.io/docs)
- [tailwindcss.com](https://tailwindcss.com)
- [react-pdf.org](https://react-pdf.org) · [react.email](https://react.email)
- [anthropic.com/docs](https://anthropic.com/docs) · [platform.openai.com/docs](https://platform.openai.com/docs)
- npm registry: `npm view <pkg> version`
