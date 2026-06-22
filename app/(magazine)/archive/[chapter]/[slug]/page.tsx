import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { getChapter } from "@/lib/chapters";
import {
  getArticleBySlug,
  listChapterArticles,
  listUsers,
  getTagsForArticle,
} from "@/lib/public-cache";
import { getCurrentUser } from "@/lib/auth";
import { ShareBar } from "@/components/ShareBar";
import { AdminEditLink } from "@/components/AdminEditLink";

/**
 * 캐시 전략:
 * - 공개 글: getCurrentUser() 미호출 → 쿠키 의존 없음 → 1시간 ISR 캐시
 * - 회원전용 글: getCurrentUser() 호출 → 쿠키 의존 → 자동으로 동적 렌더링
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string; slug: string }>;
}) {
  const { chapter, slug } = await params;
  const article = await getArticleBySlug(chapter, slug);
  if (!article) return {};
  return {
    title: `${article.title} — 영가회 아카이브`,
    description: article.excerpt ?? undefined,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ chapter: string; slug: string }>;
}) {
  const { chapter, slug } = await params;
  const meta = getChapter(chapter);
  const article = await getArticleBySlug(chapter, slug);
  if (!meta || !article) notFound();

  /**
   * 회원전용 글은 서버에서 사용자 확인 (보안)
   * 공개 글은 getCurrentUser() 를 호출하지 않아 캐싱 가능
   */
  let isLocked = false;
  if (article.visibility === "members-only") {
    const user = await getCurrentUser(); // ← 쿠키 읽기 → 이 URL만 동적 렌더링
    isLocked = !user;
  }

  const [all, users, tags] = await Promise.all([
    listChapterArticles(chapter),
    listUsers(),
    getTagsForArticle(article.id),
  ]);
  const idx = all.findIndex((a) => a.slug === slug);
  const prev = idx >= 0 ? all[idx + 1] : undefined;
  const next = idx > 0 ? all[idx - 1] : undefined;
  const authorAvatar = article.author
    ? users.find((u) => u.name === article.author)?.avatar_url ?? null
    : null;

  return (
    <article>
      {/* HEADER — 커버 이미지 있으면 풀블리드, 없으면 종이톤 배경 */}
      <header className={`relative overflow-hidden pt-40 pb-16 sm:pb-24 ${article.cover ? "" : "bg-[var(--color-bg-soft)]"}`}>
        {article.cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/75" />
          </>
        )}
        <div className={`relative mx-auto max-w-3xl px-6 ${article.cover ? "text-white" : ""}`}>
          <nav className={`kicker mb-8 flex flex-wrap gap-x-2 items-center ${article.cover ? "text-white/70" : "text-[var(--color-ink-mute)]"}`}>
            <Link href="/archive" className={article.cover ? "hover:text-white" : "hover:text-[var(--color-ink)]"}>
              아카이브
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/archive/${chapter}`}
              className={article.cover ? "hover:text-white" : "hover:text-[var(--color-ink)]"}
            >
              {meta.number}. {meta.title}
            </Link>
            {/* 관리자 편집 버튼 — 클라이언트에서 /api/me 조회, 캐시에 영향 없음 */}
            <AdminEditLink
              href={`/admin/articles/${article.id}/edit`}
              label="수정"
              className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition ${
                article.cover
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-[var(--color-ink)] text-white hover:opacity-80"
              }`}
            />
          </nav>

          {article.visibility === "members-only" && (
            <div className={`inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full text-xs font-semibold ${article.cover ? "bg-white/20 text-white" : "bg-[var(--color-ink)] text-white"}`}>
              🔒 회원 전용
            </div>
          )}
          <h1 className="display text-4xl sm:text-6xl mb-5">
            {article.title}
          </h1>
          {article.subtitle && (
            <p className={`text-xl sm:text-2xl mb-6 ${article.cover ? "text-white/80" : "text-[var(--color-ink-soft)]"}`}>
              {article.subtitle}
            </p>
          )}
          <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ${article.cover ? "text-white/70" : "text-[var(--color-ink-mute)]"}`}>
            <span className="font-mono tabular-nums">
              {formatDate(article.date)}
            </span>
            {article.author && (
              <span className="inline-flex items-center gap-2">
                <AuthorAvatar
                  src={authorAvatar}
                  name={article.author}
                  size={28}
                />
                <span>글 · {article.author}</span>
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {tags.map((t) => (
                <Link
                  key={t}
                  href={`/search?tag=${encodeURIComponent(t)}`}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs border transition ${
                    article.cover
                      ? "border-white/30 text-white/70 hover:border-white hover:text-white"
                      : "border-[var(--color-rule)] text-[var(--color-ink-mute)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  # {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* BODY — 본문은 종이 같은 따뜻한 배경 + 본명조 */}
      <div className="bg-[var(--color-paper)] py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-6">
          {isLocked ? (
            <MemberGate
              chapter={chapter}
              slug={slug}
              excerpt={article.excerpt ?? undefined}
            />
          ) : (
            <div
              className="prose-body"
              dangerouslySetInnerHTML={{ __html: article.html }}
            />
          )}

          {/* 공유 */}
          {!isLocked && (
            <div className="mt-16 pt-10 border-t border-[var(--color-rule)]">
              <div className="text-xs text-[var(--color-ink-mute)] mb-3">
                이 글이 도움이 되셨다면 공유해 주세요
              </div>
              <ShareBar
                title={article.title}
                path={`/archive/${chapter}/${slug}`}
                excerpt={article.excerpt}
              />
            </div>
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
              &ldquo;{excerpt}&rdquo;
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
