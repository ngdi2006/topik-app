import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://epstopik.korealink.edu.vn"),
  title: {
    default: "Học tiếng Hàn EPS-TOPIK cùng Korea Link",
    template: "%s | Korea Link",
  },
  description:
    "Học tiếng Hàn EPS-TOPIK, thi thử và luyện Phỏng vấn Vòng 2 theo ngành nghề cùng Korea Link.",
  applicationName: "Korea Link EPS-TOPIK",
  keywords: [
    "EPS-TOPIK",
    "học tiếng Hàn",
    "thi thử EPS-TOPIK",
    "Phỏng vấn Vòng 2",
    "Korea Link",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "Korea Link EPS-TOPIK",
    title: "Học tiếng Hàn EPS-TOPIK cùng Korea Link",
    description:
      "Thi thử EPS-TOPIK và luyện Phỏng vấn Vòng 2 theo ngành nghề trên một lộ trình học tập toàn diện.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Học tiếng Hàn EPS-TOPIK và luyện Phỏng vấn Vòng 2 cùng Korea Link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Học tiếng Hàn EPS-TOPIK cùng Korea Link",
    description:
      "Thi thử EPS-TOPIK và luyện Phỏng vấn Vòng 2 theo ngành nghề trên một lộ trình học tập toàn diện.",
    images: ["/opengraph-image"],
  },
};

import { Toaster } from 'sonner';

import { PresenceTracker } from '@/components/shared/PresenceTracker';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${inter.className} antialiased`}
      >
        {children}
        <PresenceTracker />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
