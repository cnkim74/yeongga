import Link from "next/link";
import {
  listAllTags,
  listArticlesByTag,
  searchArticles,
} from "@/lib/public-cache";
import { chapters } from "@/lib/chapters";
import { PageHeroBg } from "@/components/PageHeroBg";

export const revalidate = 3600; // 1시간 캐시 — 태그 변경 시 어드민에서 revalidatePath 호출

export const metadata = {
  title: "키워드 검색 — 영가회",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  const { tag, q } = await searchParams;

  const [allTags, articles] = await Promise.all([
    listAllTags(),
    tag
      ? listArticlesByTag(tag)
      : q
      ? searchArticles(q)
      : Promise.resolve([]),
  ]);

  const chapterMap = Object.fromEntries(chapters.map((c) => [c.slug, c]));
  const activeTag = tag ?? null;

  return (
    <>
      {/* 헤더 */}
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-16">
        <PageHeroBg page="search" />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            SEARCH · 키워드 검색
          </div>
          <h1 className="display text-4xl sm:text-6xl mb-8">
            키워드로 찾기
          </h1>

          {/* 검색 폼 */}
          <form method="GET" action="/search" className="relative mb-2">
            <input
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="제목, 글쓴이, 키워드로 검색…"
              className="w-full border border-[var(--color-rule)] rounded-full px-6 py-3 pr-14 text-base bg-white focus:outline-none focus:border-[var(--color-ink)] transition"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
              aria-label="검색"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </form>
          {q && (
            <p className="text-sm text-[var(--color-ink-mute)]">
              &ldquo;{q}&rdquo; 검색 결과 {articles.length}편
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">

        {/* ── 베스트 10 키워드 ── */}
        {allTags.length > 0 && (
          <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-[var(--color-ink)] text-white">
            <h2 className="text-xs font-mono tracking-widest text-white/50 mb-5 uppercase">
              Best 10 · 많이 찾는 키워드
            </h2>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 10).map(({ tag: t, count }, i) => {
                const isActive = t === activeTag;
                return (
                  <Link
                    key={t}
                    href={isActive ? "/search" : `/search?tag=${encodeURIComponent(t)}`}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-[var(--color-ink)]"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    <span className="text-white/40 text-xs tabular-nums w-4 text-center">
                      {i + 1}
                    </span>
                    {t}
                    <span className={`text-xs tabular-nums ${isActive ? "text-[var(--color-ink-mute)]" : "text-white/40"}`}>
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 키워드 전체 */}
        <div className="mb-12">
          <h2 className="text-xs font-mono tracking-widest text-[var(--color-ink-mute)] mb-5 uppercase">
            키워드 전체
          </h2>
          {allTags.length === 0 ? (
            <p className="text-[var(--color-ink-mute)] text-sm">
              아직 등록된 키워드가 없습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTags.map(({ tag: t, count }) => {
                const isActive = t === activeTag;
                return (
                  <Link
                    key={t}
                    href={isActive ? "/search" : `/search?tag=${encodeURIComponent(t)}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
                      isActive
                        ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]"
                        : "border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                    }`}
                  >
                    {t}
                    <span
                      className={`text-xs tabular-nums ${
                        isActive ? "text-white/70" : "text-[var(--color-ink-mute)]"
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 결과 */}
        {(tag || q) && (
          <div>
            <h2 className="text-xs font-mono tracking-widest text-[var(--color-ink-mute)] mb-5 uppercase">
              {activeTag ? `# ${activeTag}` : `"${q}"`} · {articles.length}편
            </h2>
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
                              <span className="inline-block mr-2 text-xs align-middle text-[var(--color-ink-mute)]">
                                🔒
                              </span>
                            )}
                            {a.title}
                          </h3>
                          {a.excerpt && (
                            <p className="text-[var(--color-ink-soft)] mt-1 line-clamp-1 text-sm">
                              {a.excerpt}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-xs text-[var(--color-ink-mute)]">
                          <div className="font-mono tabular-nums">
                            {formatDate(a.date)}
                          </div>
                          {a.author && (
                            <div className="mt-0.5">{a.author}</div>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* 아무 검색도 없을 때 안내 */}
        {!tag && !q && allTags.length > 0 && (
          <p className="text-sm text-[var(--color-ink-mute)] text-center py-8">
            키워드를 클릭하거나 위에서 검색어를 입력하세요.
          </p>
        )}
      </div>
    </>
  );
}
