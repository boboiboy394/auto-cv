import Link from "next/link";

/**
 * Site footer.
 * Tests: tests/landing/conversion-sections.spec.tsx
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="text-lg font-bold text-foreground">JobBoost AI</span>
            <p className="text-sm text-muted-foreground">
              Customize CV. Land interviews.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Chính sách bảo mật
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Điều khoản sử dụng
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} JobBoost AI
          </p>
        </div>
      </div>
    </footer>
  );
}
