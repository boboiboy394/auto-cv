/**
 * RED Phase — Conversion sections tests
 *
 * Tests define what SignupCTA, FAQSection, and Footer must render.
 * They MUST FAIL until components are implemented.
 */
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { SignupCTA } from "@/app/(marketing)/_components/signup-cta";
import { FAQSection } from "@/app/(marketing)/_components/faq-section";
import { Footer } from "@/app/(marketing)/_components/footer";

describe("SignupCTA", () => {
  it("renders final CTA with sign-up link", () => {
    render(<SignupCTA />);
    const cta = screen.getByRole("link", { name: /bắt đầu|đăng ký|sign up/i });
    expect(cta).toHaveAttribute("href", "/sign-up");
  });

  it("renders freemium messaging", () => {
    render(<SignupCTA />);
    // Subtext phải chứa "3 job đầu tiên"
    const freemiumText = screen.getByText(/3 job đầu tiên/i);
    expect(freemiumText).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SignupCTA />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

describe("FAQSection", () => {
  it("renders at least 5 FAQ questions", () => {
    render(<FAQSection />);
    // FAQ accordion/list items — each question in a button or heading
    const questions = screen.getAllByRole("button");
    expect(questions.length).toBeGreaterThanOrEqual(5);
  });

  it("renders 'Is it free?' FAQ question", () => {
    render(<FAQSection />);
    const freeFAQ = screen.getByText(/miễn phí|free|3 job/i);
    expect(freeFAQ).toBeInTheDocument();
  });

  it("renders privacy FAQ question", () => {
    render(<FAQSection />);
    const privacyFAQ = screen.getByText(/privacy|riêng tư|bảo mật/i);
    expect(privacyFAQ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FAQSection />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

describe("Footer", () => {
  it("renders privacy policy link", () => {
    render(<Footer />);
    const privacyLink = screen.getByRole("link", { name: /privacy|bảo mật|chính sách bảo mật/i });
    expect(privacyLink).toBeInTheDocument();
  });

  it("renders terms of service link", () => {
    render(<Footer />);
    const termsLink = screen.getByRole("link", { name: /terms|điều khoản/i });
    expect(termsLink).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Footer />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
