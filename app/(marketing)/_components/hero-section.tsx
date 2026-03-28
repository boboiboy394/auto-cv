import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center gap-6 px-6 py-32 text-center">
      {/* Freemium badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        Miễn phí 3 job đầu tiên
      </div>

      {/* Main headline */}
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-foreground">
        Customize CV theo Job Description trong{" "}
        <span className="text-primary">vài phút</span>
      </h1>

      {/* Subheadline */}
      <p className="max-w-2xl text-xl text-muted-foreground">
        Upload CV → Dán JD → Nhận CV đã tối ưu, research công ty,
        mock interview và tech prep — tất cả chỉ trong một lần thao tác.
      </p>

      {/* CTAs */}
      <div className="flex gap-4 pt-4">
        <Link
          href="/sign-up"
          className="rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Bắt đầu miễn phí
        </Link>
        <Link
          href="#how-it-works"
          className="rounded-full border border-border px-8 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Xem cách hoạt động
        </Link>
      </div>
    </section>
  );
}
