import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "THI THỬ EPS-TOPIK CÙNG KOREA LINK",
  description: "Nền tảng học tiếng Hàn và đánh giá năng lực tích hợp AI",
};

import { Toaster } from 'sonner';
import { OnlineSupportWidget } from '@/components/shared/OnlineSupportWidget';
import { PresenceTracker } from '@/components/shared/PresenceTracker';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`}
      >
        {children}
        <OnlineSupportWidget />
        <PresenceTracker />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
