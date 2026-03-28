/**
 * How It Works section — 3-step flow.
 * Tests: tests/landing/value-sections.spec.tsx
 */
export function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: "Upload CV",
      description: "Upload CV của bạn (PDF hoặc Word). Hệ thống tự động parse thông tin.",
    },
    {
      number: 2,
      title: "Dán Job Description",
      description:
        "Dán JD từ job posting hoặc cung cấp link. AI phân tích yêu cầu.",
    },
    {
      number: 3,
      title: "Nhận kết quả",
      description:
        "CV đã tối ưu + research công ty + mock interview Q&A + tech prep trong vài phút.",
    },
  ];

  return (
    <section
      data-testid="how-it-works-section"
      id="how-it-works"
      className="bg-muted/30 py-24"
    >
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-16 text-center text-4xl font-bold tracking-tight text-foreground">
          Cách hoạt động
        </h2>

        <div className="grid gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {step.number}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
