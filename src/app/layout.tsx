import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://epstopik.korealink.edu.vn"),
  title: {
    default: "HỌC TIẾNG HÀN EPS-TOPIK CÙNG KOREA LINK",
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
    title: "HỌC TIẾNG HÀN EPS-TOPIK CÙNG KOREA LINK",
    description:
      "Thi thử EPS-TOPIK và luyện Phỏng vấn Vòng 2 theo ngành nghề trên một lộ trình học tập toàn diện.",
    images: [
      {
        url: "/images/logo/LOGO-BK.png",
        width: 1106,
        height: 1106,
        alt: "Logo Korea Link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HỌC TIẾNG HÀN EPS-TOPIK CÙNG KOREA LINK",
    description:
      "Thi thử EPS-TOPIK và luyện Phỏng vấn Vòng 2 theo ngành nghề trên một lộ trình học tập toàn diện.",
    images: ["/images/logo/LOGO-BK.png"],
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
