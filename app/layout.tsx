import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import {
  ReadingSizeProvider,
  READING_INIT_SCRIPT,
} from "@/components/ReadingSizeProvider";
import { GAUserIdentify } from "@/components/GAUserIdentify";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
        {/* 폰트 — 동일 origin 미리 연결 후 swap 으로 비차단 로드 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: READING_INIT_SCRIPT }} />
        {/* 테마 초기화 — hydration 전에 html data-theme 동기화 (FOUC 방지).
            디폴트는 라이트, localStorage 에 'dark' 가 저장된 경우만 다크. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('yeongga-header-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ReadingSizeProvider>{children}</ReadingSizeProvider>
        {GA_ID && (
          <>
            <GoogleAnalytics gaId={GA_ID} />
            <GAUserIdentify />
          </>
        )}
      </body>
    </html>
  );
}
