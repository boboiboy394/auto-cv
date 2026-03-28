/**
 * RED Phase — Step 1.2.1: Marketing page test harness
 *
 * This test MUST FAIL before we implement the marketing page.
 * If it passes, we have nothing to build.
 */
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import MarketingPage from "@/app/(marketing)/page";

describe("MarketingPage", () => {
  it("renders hero headline targeting IT candidates", () => {
    render(<MarketingPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(
      h1.textContent?.toLowerCase().includes("ứng viên") ||
        h1.textContent?.toLowerCase().includes("cv") ||
        h1.textContent?.toLowerCase().includes("job")
    ).toBe(true);
  });

  it("renders primary CTA linking to sign-up", () => {
    render(<MarketingPage />);
    // HeroSection + SignupCTA both have CTA links → check at least one /sign-up
    const ctas = screen.getAllByRole("link", { name: /bắt đầu|đăng ký|sign up/i });
    expect(ctas.some((cta) => cta.getAttribute("href") === "/sign-up")).toBe(true);
  });

  it("renders freemium badge with 3-job offer", () => {
    render(<MarketingPage />);
    // HeroSection badge has "3 job đầu tiên"
    const freemiumTexts = screen.getAllByText(/3 job.*đầu tiên/i);
    expect(freemiumTexts.length).toBeGreaterThan(0);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<MarketingPage />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
