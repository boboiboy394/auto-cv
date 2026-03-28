"use client";

import { useState } from "react";

/**
 * FAQ section with accordion.
 * Tests: tests/landing/conversion-sections.spec.tsx
 */

const faqs = [
  {
    question: "Việc sử dụng có miễn phí không?",
    answer:
      "Có! Bạn được sử dụng miễn phí 3 job đầu tiên mỗi tháng. Không cần thẻ tín dụng để đăng ký.",
  },
  {
    question: "CV của tôi có được bảo mật không?",
    answer:
      "Hoàn toàn. CV của bạn được mã hóa và chỉ bạn mới có quyền truy cập. Chúng tôi không chia sẻ dữ liệu của bạn cho bất kỳ bên thứ ba nào.",
  },
  {
    question: "Hệ thống hỗ trợ những định dạng CV nào?",
    answer:
      "Hiện tại chúng tôi hỗ trợ file PDF và Word (.docx). File tối đa 10MB.",
  },
  {
    question: "Kết quả có gửi qua email không?",
    answer:
      "Có! Sau khi hoàn tất, bạn sẽ nhận email với CV đã tối ưu (PDF), research công ty, mock interview và tech prep.",
  },
  {
    question: "AI có thay đổi nội dung thật trên CV không?",
    answer:
      "Không. AI chỉ điều chỉnh cách trình bày và từ khóa để match JD, không bịa đặt kinh nghiệm hay kỹ năng. Mọi thông tin đều dựa trên CV gốc của bạn.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-semibold text-foreground">{question}</span>
        <span className="ml-4 text-primary" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <p className="pb-5 text-muted-foreground">{answer}</p>
      )}
    </div>
  );
}

export function FAQSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-12 text-center text-4xl font-bold tracking-tight text-foreground">
          Câu hỏi thường gặp
        </h2>
        <div>
          {faqs.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
