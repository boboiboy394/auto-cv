/**
 * Features section — 4 deliverable cards.
 * Tests: tests/landing/value-sections.spec.tsx
 */

const features = [
  {
    icon: "📄",
    title: "CV Tối ưu theo JD",
    description:
      "AI rewrite CV bullet points để match JD keywords, tăng ATS score và khả năng được gọi phỏng vấn.",
  },
  {
    icon: "🏢",
    title: "Research Công ty",
    description:
      "Báo cáo chi tiết về văn hóa, sản phẩm, tin tức và tips phỏng vấn đặc thù của công ty mục tiêu.",
  },
  {
    icon: "🎤",
    title: "Mock Interview Q&A",
    description:
      "10-15 câu hỏi phỏng vấn theo STAR format, kèm suggested answers — chuẩn bị tự tin cho mọi buổi phỏng vấn.",
  },
  {
    icon: "⚡",
    title: "Tech Prep Sheet",
    description:
      "Cheat sheet các topics kỹ thuật cần ôn, sắp xếp theo mức độ quan trọng trong JD.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-16 text-center text-4xl font-bold tracking-tight text-foreground">
          Tất cả trong một lần thao tác
        </h2>

        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-border bg-card p-8 shadow-sm"
            >
              <div className="mb-4 text-4xl" role="img" aria-label={feature.title}>
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
