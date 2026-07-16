import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "이음 IEUM — 한국형 온체인 에스크로",
  description:
    "전세금 반환, 이사 잔금, 곗돈. 한국인의 목돈이 움직이는 길을 스마트 컨트랙트로 잇습니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-black text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
