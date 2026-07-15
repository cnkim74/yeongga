import Link from "next/link";
import {
  listAllTags,
  listArticlesByTag,
  searchArticles,
} from "@/lib/tags-db";
import {
  listYears,
  listArticlesByYear,
  listArticlesBySlugPrefix,
  type ArticleMeta,
} from "@/lib/articles-db";
import { presidents, getPresident } from "@/lib/presidents";
import { chapters } from "@/lib/chapters";
import { PageHeroBg } from "@/components/PageHeroBg";
import { GAEventOnMount } from "@/components/GAEventOnMount";
import { LiveSearch } from "@/components/LiveSearch";

export const revalidate = 3600;

export const metadata = {
  title: "검색 — 영가회",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; year?: string; president?: string }>;
}) {
  const { tag, year, president } = await searchParams;

  // 둘러보기 메뉴 데이터
  const [allTags, years] = await Promise.all([listAllTags(), listYears()]);
  const decades = allTags
    .filter((t) => /^\d{4}년대$/.test(t.tag))
    .sort((a, b) => b.tag.localeCompare(a.tag));

  // 예시 검색어 — 연대 태그를 뺀 대표 키워드 몇 개만
  const examples = allTags
    .filter((t) => !/^\d{4}년대$/.test(t.tag))
    .slice(0, 5)
    .map((t) => t.tag);

  // 둘러보기(회장별·연도별·시대별) 클릭 시 서버에서 결과 렌더
  let browseArticles: ArticleMeta[] = [];
  let browseLabel = "";
  if (president) {
    const p = getPresident(president);
    if (p?.slugPrefix) browseArticles = await listArticlesBySlugPrefix(p.slugPrefix);
    else if (p?.keyword) browseArticles = await searchArticles(p.keyword);
    browseLabel = p ? `${p.dae}대 ${p.name} 회장 시기 기록` : "회장별";
  } else if (year) {
    browseArticles = await listArticlesByYear(year);
    browseLabel = `${year}년 회보`;
  } else if (tag) {
    browseArticles = await listArticlesByTag(tag);
    browseLabel = `# ${tag}`;
  }
  const hasBrowse = Boolean(president || year || tag);

  const chapterMap = Object.fromEntries(chapters.map((c) => [c.slug, c]));

  return (
    <>
      {hasBrowse && (
        <GAEventOnMount
          event="site_search"
          params={{
            search_tag: tag ?? "",
            search_year: year ?? "",
            search_president: president ?? "",
            result_count: browseArticles.length,
            search_type: president ? "president" : year ? "year" : "tag",
          }}
        />
      )}

      {/* ── 히어로: 큰 검색창 하나 ── */}
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-28 sm:pt-40 pb-12 sm:pb-20">
        <PageHeroBg page="search" />
        <div className="relative mx-auto max-w-3xl px-5 sm:px-6 text-center">
          <div className="kicker text-[var(--color-ink-mute)] mb-4 sm:mb-5">SEARCH · 검색</div>
          <h1 className="display text-3xl sm:text-6xl mb-3 sm:mb-4">무엇을 찾으세요?</h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] mb-7 sm:mb-10">
            제목·글쓴이·내용 무엇이든 입력하면 바로 찾아 드립니다.
          </p>
          <LiveSearch examples={examples} />
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-5 sm:px-6 pt-8 pb-12 sm:py-16">
        {/* ── 둘러보기 결과 (회장별/연도별 클릭 시) ── */}
        {hasBrowse && (
          <div className="mb-14">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="display-md text-xl sm:text-2xl">
                {browseLabel}{" "}
                <span className="text-[var(--color-ink-mute)] text-base">· {browseArticles.length}편</span>
              </h2>
              <Link href="/search" className="text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]">
                ✕ 전체 보기
              </Link>
            </div>
            {browseArticles.length === 0 ? (
              <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
                일치하는 글이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-rule)] border-t border-b border-[var(--color-rule)]">
                {browseArticles.map((a) => {
                  const c = chapterMap[a.chapter];
                  return (
                    <li key={`${a.chapter}/${a.slug}`}>
                      <Link
                        href={`/archive/${a.chapter}/${a.slug}`}
                        className="flex items-baseline justify-between gap-6 py-5 px-2 hover:bg-[var(--color-bg-soft)] transition group"
                      >
                        <div>
                          <div className="text-sm text-[var(--color-ink-mute)] mb-1">
                            {c ? `${c.number}. ${c.title}` : a.chapter}
                          </div>
                          <h3 className="display-md text-xl sm:text-2xl group-hover:text-[var(--color-accent)] transition">
                            {a.visibility === "members-only" && (
                              <span className="inline-block mr-2 text-xs align-middle text-[var(--color-ink-mute)]">🔒</span>
                            )}
                            {a.title}
                          </h3>
                          {a.excerpt && (
                            <p className="text-[var(--color-ink-soft)] mt-1 line-clamp-1 text-base">{a.excerpt}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-sm text-[var(--color-ink-mute)]">
                          <div className="font-mono tabular-nums">{formatDate(a.date)}</div>
                          {a.author && <div className="mt-0.5">{a.author}</div>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── 둘러보기: 회장별·연도별 (작게 접어두기) ── */}
        <details className="group rounded-2xl border border-[var(--color-rule)] bg-white/40" open={hasBrowse}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 select-none">
            <span className="display-md text-lg sm:text-xl">📚 회장별·연도별로 둘러보기</span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-[var(--color-ink-mute)] transition group-open:rotate-180"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </summary>

          <div className="border-t border-[var(--color-rule)] px-6 py-7 space-y-10">
            {/* 회장별 */}
            <section>
              <h3 className="display-md text-base mb-1">👤 회장별로 보기</h3>
              <p className="text-sm text-[var(--color-ink-mute)] mb-4">역대 회장의 재임 시기별 기록을 모아 봅니다.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {presidents.map((p) => {
                  const active = president === p.id;
                  return (
                    <Link
                      key={p.id}
                      href={active ? "/search" : `/search?president=${p.id}`}
                      className={`relative rounded-2xl border p-4 transition ${
                        active
                          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                          : p.current
                          ? "border-[var(--color-accent)] hover:bg-[var(--color-bg-soft)]"
                          : "border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                      }`}
                    >
                      {p.current && (
                        <span
                          className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            active ? "bg-white text-[var(--color-ink)]" : "bg-[var(--color-accent)] text-white"
                          }`}
                        >
                          현 회장
                        </span>
                      )}
                      <div className={`text-xs mb-1 ${active ? "text-white/60" : "text-[var(--color-ink-mute)]"}`}>
                        제{p.dae}대
                      </div>
                      <div className="display-md text-lg">{p.name}</div>
                      <div className={`text-xs mt-0.5 font-mono ${active ? "text-white/70" : "text-[var(--color-ink-mute)]"}`}>
                        {p.term}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* 연도별 */}
            <section>
              <h3 className="display-md text-base mb-1">🗓 연도별로 보기</h3>
              <p className="text-sm text-[var(--color-ink-mute)] mb-4">회보 발행연도, 또는 시대(연대)로 찾습니다.</p>

              {years.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-[var(--color-ink-mute)] mb-2">발행연도</div>
                  <div className="flex flex-wrap gap-2">
                    {years.map(({ year: y, count }) => {
                      const active = year === y;
                      return (
                        <Link
                          key={y}
                          href={active ? "/search" : `/search?year=${y}`}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-base font-medium transition ${
                            active
                              ? "bg-[var(--color-ink)] text-white"
                              : "border border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                          }`}
                        >
                          {y}년
                          <span className={`text-xs tabular-nums ${active ? "text-white/60" : "text-[var(--color-ink-mute)]"}`}>{count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {decades.length > 0 && (
                <div>
                  <div className="text-xs text-[var(--color-ink-mute)] mb-2">시대별</div>
                  <div className="flex flex-wrap gap-2">
                    {decades.map(({ tag: t, count }) => {
                      const active = tag === t;
                      return (
                        <Link
                          key={t}
                          href={active ? "/search" : `/search?tag=${encodeURIComponent(t)}`}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-base font-medium transition ${
                            active
                              ? "bg-[var(--color-ink)] text-white"
                              : "border border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                          }`}
                        >
                          {t}
                          <span className={`text-xs tabular-nums ${active ? "text-white/60" : "text-[var(--color-ink-mute)]"}`}>{count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </details>
      </div>
    </>
  );
}
