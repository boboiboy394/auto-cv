/**
 * Stats bar — social proof metrics.
 * Tests: tests/landing/value-sections.spec.tsx
 */

const stats = [
  { value: "2,000+", label: "ứng viên IT đã dùng" },
  { value: "< 5 phút", label: "từ upload đến kết quả" },
  { value: "3 lần", label: "dùng miễn phí mỗi tháng" },
];

export function StatsBar() {
  return (
    <section className="border-y border-border bg-muted/20 py-12">
      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-12 px-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1"
          >
            <span
              data-testid="stat-value"
              className="text-4xl font-bold text-primary"
            >
              {stat.value}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
