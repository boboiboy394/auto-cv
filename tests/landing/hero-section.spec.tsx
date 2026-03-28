/**
 * RED Phase — HeroSection component tests
 *
 * These tests define the HeroSection contract.
 * They MUST FAIL until HeroSection is implemented.
 */
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { HeroSection } from "@/app/(marketing)/_components/hero-section";

describe("HeroSection", () => {
  it("renders main headline with CV customization value proposition", () => {
    render(<HeroSection />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    // H1 phải nhắm đến IT candidates và CV
    expect(
      h1.textContent?.toLowerCase().match(/cv|ứng viên|job/i)
    ).toBeTruthy();
  });

  it("renders primary CTA linking to /sign-up", () => {
    render(<HeroSection />);
    const cta = screen.getByRole("link", { name: /bắt đầu|đăng ký|sign up/i });
    expect(cta).toHaveAttribute("href", "/sign-up");
  });

  it("renders secondary CTA linking to #how-it-works", () => {
    render(<HeroSection />);
    const cta = screen.getByRole("link", { name: /cách hoạt động|xem thêm/i });
    expect(cta).toHaveAttribute("href", "#how-it-works");
  });

  it("renders freemium badge with 3-job offer", () => {
    render(<HeroSection />);
    const badge = screen.getByText(/3\s*job/i);
    expect(badge).toBeInTheDocument();
  });

  it("renders subheadline describing the product", () => {
    render(<HeroSection />);
    // Subheadline: <p> tag với class text-xl chứa "Upload CV"
    const subheadline = screen.getByText(/Upload CV.*Dán JD.*Nhận CV đã tối ưu/i);
    expect(subheadline).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<HeroSection />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
