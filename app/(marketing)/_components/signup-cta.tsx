import Link from "next/link";

/**
 * Final conversion CTA section.
 * Tests: tests/landing/conversion-sections.spec.tsx
 */
export function SignupCTA() {
  return (
    <section className="bg-primary py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-6 text-4xl font-bold tracking-tight text-primary-foreground">
          Sẵn sàng tăng cơ hội gọi phỏng vấn?
        </h2>
        <p className="mb-8 text-xl text-primary-foreground/80">
          Bắt đầu miễn phí với 3 job đầu tiên. Không cần thẻ tín dụng.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="rounded-full bg-white px-10 py-4 text-lg font-bold text-primary transition-colors hover:bg-white/90"
          >
            Bắt đầu miễn phí ngay
          </Link>
        </div>
      </div>
    </section>
  );
}
