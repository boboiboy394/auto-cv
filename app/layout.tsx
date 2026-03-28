import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | JobBoost AI",
    default: "JobBoost AI — Customize CV theo Job Description",
  },
  description:
    "Giúp ứng viên IT tự động customize CV theo JD, nghiên cứu công ty và chuẩn bị phỏng vấn trong vài phút. Miễn phí 3 job đầu tiên.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    siteName: "JobBoost AI",
    title: "JobBoost AI — Customize CV theo Job Description",
    description:
      "Upload CV → Dán JD → Nhận CV tối ưu, research công ty, mock interview và tech prep. Miễn phí 3 job đầu tiên.",
  },
  twitter: {
    card: "summary_large_image",
    title: "JobBoost AI",
    description: "Customize CV theo Job Description — miễn phí 3 job đầu tiên.",
  },
  keywords: [
    "CV template",
    "job application",
    "IT resume",
    "customize CV",
    "ATS optimization",
    "phỏng vấn IT",
    "việc làm IT",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="vi" className="h-full">
        <body
          className={`${geistSans.variable} ${geistMono.variable} h-full min-h-screen flex flex-col font-sans antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
