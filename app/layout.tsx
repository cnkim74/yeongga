import type { Metadata } from "next";
import "./globals.css";
import {
  ReadingSizeProvider,
  READING_INIT_SCRIPT,
} from "@/components/ReadingSizeProvider";

export const metadata: Metadata = {
  title: "영가회 永嘉會 — 아카이브",
  description:
    "오랜 인연으로 모인 회원들의 글, 모임, 사진을 기록하는 영가회의 매거진형 아카이브.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-reading="3" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: READING_INIT_SCRIPT }} />
      </head>
      <body>
        <ReadingSizeProvider>{children}</ReadingSizeProvider>
      </body>
    </html>
  );
}
