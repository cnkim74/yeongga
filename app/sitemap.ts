import type { MetadataRoute } from "next";
import { listAllArticles } from "@/lib/articles-db";
import { chapters } from "@/lib/chapters";

const BASE = "https://yeongga.com";

// 1시간마다 재생성 — 봇이 sitemap 으로 실제 글을 색인하게 해 /search 크롤을 줄인다.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["", "/archive", "/gallery", "/videos", "/about", "/ebooks"];
  const urls: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: "weekly",
  }));

  // 챕터 아카이브
  for (const c of chapters) {
    if (!c.comingSoon && !c.href) {
      urls.push({ url: `${BASE}/archive/${c.slug}`, changeFrequency: "weekly" });
    }
  }

  // 개별 글 — DB 장애 시에도 사이트맵이 죽지 않도록 보호
  try {
    const articles = await listAllArticles();
    for (const a of articles) {
      urls.push({
        url: `${BASE}/archive/${a.chapter}/${a.slug}`,
        lastModified: a.updated_at || a.created_at || undefined,
        changeFrequency: "monthly",
      });
    }
  } catch {
    // DB 미응답 시 정적 경로만 반환
  }

  return urls;
}
