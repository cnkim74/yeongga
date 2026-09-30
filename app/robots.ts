import type { MetadataRoute } from "next";

const BASE = "https://yeongga.com";

// 검색·API·회원/관리 경로는 크롤링 금지 — 봇이 /search?q=... 를 긁으며
// 매번 전체 글 풀스캔을 유발하던 읽기 폭증을 차단한다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/search",
          "/api/",
          "/admin",
          "/login",
          "/signup",
          "/board",
          "/documents",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
