import { requireAdmin } from "@/lib/auth";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { IconHome, IconSlides } from "@/components/admin/AdminIcons";
import { chapters } from "@/lib/chapters";
import { listChapterMetas } from "@/lib/chapter-meta-db";
import { listAllArticles } from "@/lib/articles-db";
import { ChapterMetaForm } from "./ChapterMetaForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "챕터 표지 — 집무실" };

export default async function AdminChaptersPage() {
  await requireAdmin();

  const [metas, allArticles] = await Promise.all([
    listChapterMetas(),
    listAllArticles(),
  ]);
  const metaMap = new Map(metas.map((m) => [m.chapter_slug, m]));
  const articlesByChapter = new Map<string, typeof allArticles>();
  for (const a of allArticles) {
    const arr = articlesByChapter.get(a.chapter) ?? [];
    arr.push(a);
    articlesByChapter.set(a.chapter, arr);
  }

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin", icon: <IconHome size={14} /> },
          { label: "챕터 표지", icon: <IconSlides size={14} /> },
        ]}
      />

      <div className="max-w-[1040px] mx-auto px-10 pt-12 pb-24">
        <div className="mb-10">
          <h1 className="font-serif text-3xl text-[var(--admin-ink)] mb-2">
            챕터 표지
            <span className="font-serif text-sm text-[var(--admin-mute)] ml-3 tracking-widest">
              章
            </span>
          </h1>
          <p className="text-[var(--admin-ink-soft)] text-sm leading-relaxed max-w-xl">
            각 챕터의 <b>대표 이미지</b>는 메인 홈 쇼케이스와 <b>챕터 페이지 상단(hero)</b> 양쪽에 함께 적용됩니다.
            <br />
            노출 방식: <b>최신</b> = 가장 최근 글 / <b>추천</b> = 지정된 글 / <b>랜덤</b> = 챕터 내 무작위.
          </p>
        </div>

        <div className="space-y-6">
          {chapters.map((c) => {
            const meta = metaMap.get(c.slug);
            const list = articlesByChapter.get(c.slug) ?? [];
            return (
              <ChapterMetaForm
                key={c.slug}
                chapter={c}
                meta={meta ?? null}
                articles={list.map((a) => ({ id: a.id, title: a.title, date: a.date }))}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
