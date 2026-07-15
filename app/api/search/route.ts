import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/tags-db";
import { chapters } from "@/lib/chapters";

// 실시간 자동검색용 — 검색창에 글자를 칠 때마다 호출된다.
// searchArticles 자체가 질의별 캐시 + 2자 미만 가드를 갖고 있어 풀스캔 폭증은 없다.
export const revalidate = 3600;

const chapterTitle: Record<string, string> = Object.fromEntries(
  chapters.map((c) => [c.slug, `${c.number}. ${c.title}`])
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ q, results: [] });
  }

  const articles = await searchArticles(q);
  const results = articles.slice(0, 30).map((a) => ({
    chapter: a.chapter,
    chapterTitle: chapterTitle[a.chapter] ?? a.chapter,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    author: a.author,
    date: a.date,
    membersOnly: a.visibility === "members-only",
  }));

  return NextResponse.json(
    { q, count: results.length, results },
    {
      headers: {
        // 같은 질의는 CDN/브라우저 캐시로 재요청 방지
        "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
