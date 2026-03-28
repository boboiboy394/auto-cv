/**
 * RED Phase — Value sections tests
 *
 * Tests define what HowItWorks, FeaturesSection, and StatsBar must render.
 * They MUST FAIL until components are implemented.
 */
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { HowItWorksSection } from "@/app/(marketing)/_components/how-it-works";
import { FeaturesSection } from "@/app/(marketing)/_components/features-section";
import { StatsBar } from "@/app/(marketing)/_components/stats-bar";

describe("HowItWorksSection", () => {
  it("renders section with id 'how-it-works' for anchor linking", () => {
    render(<HowItWorksSection />);
    const section = screen.getByTestId("how-it-works-section");
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("id", "how-it-works");
  });

  it("renders 3-step flow labels", () => {
    render(<HowItWorksSection />);
    // 3 bước: Upload CV, Dán JD, Nhận kết quả (heading h3)
    expect(screen.getByRole("heading", { level: 3, name: /Upload CV/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Dán Job Description/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Nhận kết quả/i })).toBeInTheDocument();
  });

  it("renders step numbers (1, 2, 3)", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<HowItWorksSection />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

describe("FeaturesSection", () => {
  it("renders 4 feature cards", () => {
    render(<FeaturesSection />);
    // Tìm 4 card features: CV tối ưu, Research công ty, Mock interview, Tech prep
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
  });

  it("renders CV customization feature", () => {
    render(<FeaturesSection />);
    const cvFeature = screen.getByText(/cv.*tối ưu|cv.*customize/i);
    expect(cvFeature).toBeInTheDocument();
  });

  it("renders company research feature", () => {
    render(<FeaturesSection />);
    const researchFeature = screen.getByRole("heading", { level: 3, name: /Research Công ty/i });
    expect(researchFeature).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FeaturesSection />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

describe("StatsBar", () => {
  it("renders at least 3 metrics", () => {
    render(<StatsBar />);
    // Stats: số người dùng, số job applications, thời gian tiết kiệm
    const statValues = screen.getAllByTestId("stat-value");
    expect(statValues.length).toBeGreaterThanOrEqual(3);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<StatsBar />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
