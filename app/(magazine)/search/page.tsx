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
  searchParams: Promise<{ tag?: string; q?: string; year?: string; president?: string }>;
}) {
  const { tag, q, year, president } = await searchParams;
  const qTrim = (q ?? "").trim();

  // 항상 필요한 메뉴 데이터
  const [allTags, years] = await Promise.all([listAllTags(), listYears()]);
  const decades = allTags
    .filter((t) => /^\d{4}년대$/.test(t.tag))
    .sort((a, b) => b.tag.localeCompare(a.tag));

  // 활성 필터에 따른 결과
  let articles: ArticleMeta[] = [];
  let resultLabel = "";
  if (president) {
    const p = getPresident(president);
    if (p?.slugPrefix) articles = await listArticlesBySlugPrefix(p.slugPrefix);
    else if (p?.keyword) articles = await searchArticles(p.keyword);
    resultLabel = p ? `${p.dae}대 ${p.name} 회장 시기 기록` : "회장별";
  } else if (year) {
    articles = await listArticlesByYear(year);
    resultLabel = `${year}년 회보`;
  } else if (tag) {
    articles = await listArticlesByTag(tag);
    resultLabel = `# ${tag}`;
  } else if (qTrim.length >= 2) {
    articles = await searchArticles(qTrim);
    resultLabel = `"${qTrim}"`;
  }
  const hasFilter = Boolean(president || year || tag || qTrim.length >= 2);

  const chapterMap = Object.fromEntries(chapters.map((c) => [c.slug, c]));
  const topTags = allTags.slice(0, 8);

  return (
    <>
      {hasFilter && (
        <GAEventOnMount
          event="site_search"
          params={{
            search_term: q ?? "",
            search_tag: tag ?? "",
            search_year: year ?? "",
            search_president: president ?? "",
            result_count: articles.length,
            search_type: president ? "president" : year ? "year" : tag ? "tag" : "keyword",
          }}
        />
      )}

      {/* 헤더 + 검색창 */}
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-16">
        <PageHeroBg page="search" />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">SEARCH · 검색</div>
          <h1 className="display text-4xl sm:text-6xl mb-8">찾아보기</h1>

          <form method="GET" action="/search" className="relative">
            <input
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="제목, 글쓴이, 키워드로 검색…"
              className="w-full border border-[var(--color-rule)] rounded-full px-6 py-4 pr-14 text-lg bg-white focus:outline-none focus:border-[var(--color-ink)] transition"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
              aria-label="검색"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        {/* ── 결과 (필터가 있을 때 맨 위에) ── */}
        {hasFilter && (
          <div className="mb-14">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="display-md text-xl sm:text-2xl">
                {resultLabel} <span className="text-[var(--color-ink-mute)] text-base">· {articles.length}편</span>
              </h2>
              <Link href="/search" className="text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]">
                ✕ 전체 보기
              </Link>
            </div>
            {articles.length === 0 ? (
              <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
                일치하는 글이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-rule)] border-t border-b border-[var(--color-rule)]">
                {articles.map((a) => {
                  const c = chapterMap[a.chapter];
                  return (
                    <li key={`${a.chapter}/${a.slug}`}>
                      <Link
                        href={`/archive/${a.chapter}/${a.slug}`}
                        className="flex items-baseline justify-between gap-6 py-5 px-2 hover:bg-[var(--color-bg-soft)] transition group"
                      >
                        <div>
                          <div className="text-xs text-[var(--color-ink-mute)] mb-1">
                            {c ? `${c.number}. ${c.title}` : a.chapter}
                          </div>
                          <h3 className="display-md text-xl sm:text-2xl group-hover:text-[var(--color-accent)] transition">
                            {a.visibility === "members-only" && (
                              <span className="inline-block mr-2 text-xs align-middle text-[var(--color-ink-mute)]">🔒</span>
                            )}
                            {a.title}
                          </h3>
                          {a.excerpt && (
                            <p className="text-[var(--color-ink-soft)] mt-1 line-clamp-1 text-sm">{a.excerpt}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-xs text-[var(--color-ink-mute)]">
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

        {/* ── 대표 메뉴: 회장별 ── */}
        <section className="mb-12">
          <h2 className="display-md text-lg sm:text-xl mb-1">👤 회장별로 보기</h2>
          <p className="text-sm text-[var(--color-ink-mute)] mb-5">역대 회장의 재임 시기별 기록을 모아 봅니다.</p>
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

        {/* ── 대표 메뉴: 연도별 ── */}
        <section className="mb-12">
          <h2 className="display-md text-lg sm:text-xl mb-1">🗓 연도별로 보기</h2>
          <p className="text-sm text-[var(--color-ink-mute)] mb-5">회보 발행연도, 또는 시대(연대)로 찾습니다.</p>

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

        {/* ── 키워드 (자주 찾는 것만 노출, 전체는 접기) ── */}
        {allTags.length > 0 && (
          <section>
            <h2 className="display-md text-lg sm:text-xl mb-4">🔖 키워드로 찾기</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {topTags.map(({ tag: t, count }) => {
                const active = tag === t;
                return (
                  <Link
                    key={t}
                    href={active ? "/search" : `/search?tag=${encodeURIComponent(t)}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
                      active
                        ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]"
                        : "border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                    }`}
                  >
                    {t}
                    <span className={`text-xs tabular-nums ${active ? "text-white/70" : "text-[var(--color-ink-mute)]"}`}>{count}</span>
                  </Link>
                );
              })}
            </div>
            {allTags.length > topTags.length && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] select-none">
                  키워드 전체 보기 ({allTags.length}개)
                </summary>
                <div className="flex flex-wrap gap-2 mt-4">
                  {allTags.map(({ tag: t, count }) => {
                    const active = tag === t;
                    return (
                      <Link
                        key={t}
                        href={active ? "/search" : `/search?tag=${encodeURIComponent(t)}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
                          active
                            ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]"
                            : "border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                        }`}
                      >
                        {t}
                        <span className={`text-xs tabular-nums ${active ? "text-white/70" : "text-[var(--color-ink-mute)]"}`}>{count}</span>
                      </Link>
                    );
                  })}
                </div>
              </details>
            )}
          </section>
        )}
      </div>
    </>
  );
}
