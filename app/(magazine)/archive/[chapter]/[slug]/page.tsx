import Link from "next/link";
import { notFound } from "next/navigation";
import {
  chapters,
  getArticle,
  getChapterArticles,
  getChapterMeta,
} from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";

export function generateStaticParams() {
  return chapters.flatMap((c) =>
    getChapterArticles(c.slug).map((a) => ({
      chapter: c.slug,
      slug: a.slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string; slug: string }>;
}) {
  const { chapter, slug } = await params;
  const article = await getArticle(chapter, slug);
  if (!article) return {};
  return {
    title: `${article.title} — 영가회 아카이브`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ chapter: string; slug: string }>;
}) {
  const { chapter, slug } = await params;
  const meta = getChapterMeta(chapter);
  const article = await getArticle(chapter, slug);
  if (!meta || !article) notFound();

  const user = await getCurrentUser();
  const isLocked =
    article.visibility === "members-only" && !user;

  const all = getChapterArticles(chapter);
  const idx = all.findIndex((a) => a.slug === slug);
  const prev = idx >= 0 ? all[idx + 1] : undefined;
  const next = idx > 0 ? all[idx - 1] : undefined;

  return (
    <article>
      {/* HEADER — 종이톤 약한 배경 */}
      <header className="bg-[var(--color-bg-soft)] pt-40 pb-16 sm:pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <nav className="kicker mb-8 flex flex-wrap gap-x-2 items-center text-[var(--color-ink-mute)]">
            <Link href="/archive" className="hover:text-[var(--color-ink)]">
              아카이브
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/archive/${chapter}`}
              className="hover:text-[var(--color-ink)]"
            >
              {meta.number}. {meta.title}
            </Link>
          </nav>

          {article.visibility === "members-only" && (
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-ink)] text-white">
              🔒 회원 전용
            </div>
          )}
          <h1 className="display text-4xl sm:text-6xl mb-5">
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="text-xl sm:text-2xl text-[var(--color-ink-soft)] mb-6">
              {article.subtitle}
            </p>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-ink-mute)]">
            <span className="font-mono tabular-nums">
              {formatDate(article.date)}
            </span>
            {article.author && <span>글 · {article.author}</span>}
          </div>
        </div>
      </header>

      {/* BODY — 본문은 종이 같은 따뜻한 배경 + 본명조 */}
      <div className="bg-[var(--color-paper)] py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-6">
          {isLocked ? (
            <MemberGate
              chapter={chapter}
              slug={slug}
              excerpt={article.excerpt}
            />
          ) : (
          <div
            className="prose-body"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />
          )}

          <hr className="border-[var(--color-rule)] my-16" />

          <nav className="grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/archive/${chapter}/${prev.slug}`}
                className="rounded-2xl border border-[var(--color-rule)] p-5 hover:bg-white transition"
              >
                <div className="kicker text-[var(--color-ink-mute)] mb-2">
                  ← 앞 글
                </div>
                <div className="display-md text-lg">{prev.title}</div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/archive/${chapter}/${next.slug}`}
                className="rounded-2xl border border-[var(--color-rule)] p-5 text-right hover:bg-white transition"
              >
                <div className="kicker text-[var(--color-ink-mute)] mb-2">
                  다음 글 →
                </div>
                <div className="display-md text-lg">{next.title}</div>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </div>
      </div>
    </article>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年 ${String(d.getMonth() + 1).padStart(2, "0")}月 ${String(
    d.getDate()
  ).padStart(2, "0")}日`;
}

function MemberGate({
  chapter,
  slug,
  excerpt,
}: {
  chapter: string;
  slug: string;
  excerpt?: string;
}) {
  const next = `/archive/${chapter}/${slug}`;
  return (
    <div className="rounded-3xl border border-[var(--color-rule)] bg-white p-10 sm:p-14 text-center">
      <div className="text-5xl mb-4 select-none">🔒</div>
      <h2 className="display-md text-2xl sm:text-3xl mb-3">
        회원만 보실 수 있는 글입니다
      </h2>
      <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-md mx-auto mb-8">
        {excerpt ? (
          <>
            <span className="block mb-3 italic text-[var(--color-ink-mute)]">
              "{excerpt}"
            </span>
            전문은 영가회 회원으로 로그인하셔야 보실 수 있습니다.
          </>
        ) : (
          <>이 글은 영가회 회원만 보실 수 있도록 표시되어 있습니다.</>
        )}
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="btn-pill"
        >
          회원 로그인 →
        </Link>
        <Link href="/archive" className="btn-pill ghost">
          아카이브로 돌아가기
        </Link>
      </div>
      <div className="mt-6 text-xs text-[var(--color-ink-mute)]">
        계정이 없으시면 운영진에게 요청하시면 발급해 드립니다.
      </div>
    </div>
  );
}
