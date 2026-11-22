import { isUndated } from "@/lib/undated";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { getChapter } from "@/lib/chapters";
import {
  getArticleBySlug,
  listChapterArticles,
} from "@/lib/articles-db";
import { getCurrentUser } from "@/lib/auth";
import { listAuthorAvatars } from "@/lib/users-db";
import { getTagsForArticle } from "@/lib/tags-db";
import { ShareBar } from "@/components/ShareBar";
import { AdminEditLink } from "@/components/AdminEditLink";
import { GAEventOnMount } from "@/components/GAEventOnMount";
import { parseByline } from "@/lib/byline";
import { getRelatedAlbums } from "@/lib/yeongi-albums";
import { HIDDEN_ARTICLE_PAGES } from "@/lib/hidden-article-pages";
import { MOVED_ARTICLES } from "@/lib/moved-articles";
import { layoutArticleForChapter } from "@/lib/event-layout";

/**
 * 캐시 전략:
 * - 공개 글: getCurrentUser() 미호출 → 쿠키 의존 없음 → 1시간 ISR 캐시
 * - 회원전용 글: getCurrentUser() 호출 → 쿠키 의존 → 자동으로 동적 렌더링
 *
 * 주의: 새 글을 배포한 직후 이 URL 을 열면(시딩 전이라 notFound) 404 응답이
 * 그대로 1시간 캐시된다. 새 글 반영 확인은 force-dynamic 인 챕터 목록
 * (/archive/<chapter>)에서 하고, 404 가 캐시됐다면 이 파일을 고쳐 재배포해
 * 프리렌더 캐시를 새로 만든다(빈 커밋은 산출물이 같아 효과 없음).
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
  if (meta && !article) {
    // 비공개로 돌렸지만 전용 페이지가 있는 글(회장 인사말 등)은 그쪽으로 넘긴다
    const page = HIDDEN_ARTICLE_PAGES[`${chapter}/${slug}`];
    if (page && (await getArticleBySlug(chapter, slug, { includeHidden: true }))) {
      redirect(page);
    }
    // 다른 장으로 옮긴 글은 새 주소로
    const moved = MOVED_ARTICLES[`${chapter}/${slug}`];
    if (moved) redirect(`/archive/${moved}/${slug}`);
  }
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

  // 태그는 곁들이는 정보다. 못 읽어도 글은 보여 준다.
  // 연혁 글은 짝지어 둔 사진 란 앨범을 본문 뒤에 붙여 보여 준다 (본문은 그대로).
  const [all, avatars, tags, related] = await Promise.all([
    listChapterArticles(chapter),
    listAuthorAvatars(),
    getTagsForArticle(article.id).catch(() => [] as string[]),
    getRelatedAlbums(chapter, slug).catch(() => null),
  ]);
  const idx = all.findIndex((a) => a.slug === slug);
  const prev = idx >= 0 ? all[idx + 1] : undefined;
  const next = idx > 0 ? all[idx - 1] : undefined;
  const authorAvatar = article.author ? avatars[article.author] ?? null : null;

  return (
    <article>
      {/* HEADER — 커버 이미지 있으면 풀블리드, 없으면 종이톤 배경 */}
      <header className={`relative overflow-hidden pt-40 pb-16 sm:pb-24 ${article.cover ? "" : "bg-[var(--color-bg-soft)]"}`}>
        {article.cover && (
          <>
            <Image
              src={article.cover}
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="100vw"
              className="object-cover select-none pointer-events-none"
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
          {chapter === "geul" ? (
            // 기고 — 회원 이름 · 직함 / 소제목 / 갈래 · 출처
            (() => {
              const by = parseByline(article.subtitle, article.author);
              const meta = [by.label, by.source].filter(Boolean).join(" · ");
              return (
                <div className={`mb-6 space-y-1.5 ${article.cover ? "text-white/80" : "text-[var(--color-ink-soft)]"}`}>
                  {by.name && (
                    <p className="text-xl sm:text-2xl">
                      <span className={`font-semibold ${article.cover ? "text-white" : "text-[var(--color-ink)]"}`}>{by.name}</span>
                      {by.role && <span className="ml-2">{by.role}</span>}
                    </p>
                  )}
                  {by.sub && <p className="text-lg sm:text-xl">{by.sub}</p>}
                  {meta && (
                    <p className={`text-sm ${article.cover ? "text-white/70" : "text-[var(--color-ink-mute)]"}`}>{meta}</p>
                  )}
                </div>
              );
            })()
          ) : (
            article.subtitle && (
              <p className={`text-xl sm:text-2xl mb-6 ${article.cover ? "text-white/80" : "text-[var(--color-ink-soft)]"}`}>
                {article.subtitle}
              </p>
            )
          )}
          <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ${article.cover ? "text-white/70" : "text-[var(--color-ink-mute)]"}`}>
            {!isUndated(chapter, slug) && (
              <span className="font-mono tabular-nums">
                {formatDate(article.date)}
              </span>
            )}
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
            <>
              <GAEventOnMount
                event="member_gate_view"
                params={{
                  chapter,
                  slug,
                  content_type: "article",
                }}
              />
              <MemberGate
                chapter={chapter}
                slug={slug}
                excerpt={article.excerpt ?? undefined}
              />
            </>
          ) : (
            <div
              className="prose-body"
              dangerouslySetInnerHTML={{
                // 행사·기고 글은 화면에서만 카드 틀을 입힌다 (저장 본문은 그대로)
                __html: layoutArticleForChapter(chapter, article.html),
              }}
            />
          )}

          {/* 관련 사진 — 사진 란 앨범 (연혁 글) */}
          {!isLocked && related?.main && (
            <section className="mt-14 pt-10 border-t border-[var(--color-rule)]">
              <h2 className="display-md text-xl mb-1">{related.main.name}</h2>
              {related.main.eventDate && (
                <div className="text-xs text-[var(--color-ink-mute)] mb-4">
                  {related.main.eventDate.replace(/-/g, ".")}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {related.main.photos.map((p) => (
                  <Link
                    key={p.id}
                    href={`/gallery?category=${related.main!.slug}`}
                    className="block overflow-hidden rounded-xl bg-[var(--color-bg-soft)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.title ?? related.main!.name}
                      loading="lazy"
                      className="w-full aspect-[4/3] object-cover hover:scale-[1.03] transition-transform duration-300"
                    />
                  </Link>
                ))}
              </div>
              <div className="mt-3 text-right">
                <Link
                  href={`/gallery?category=${related.main.slug}`}
                  className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
                >
                  사진 란에서 앨범 전체 보기 →
                </Link>
              </div>
            </section>
          )}

          {!isLocked && related && related.others.length > 0 && (
            <section className="mt-14 pt-10 border-t border-[var(--color-rule)]">
              <h2 className="display-md text-xl mb-4">이 시기의 행사 사진</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {related.others.map((al) => (
                  <Link
                    key={al.slug}
                    href={`/gallery?category=${al.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-rule)] bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-[4/3] bg-[var(--color-bg-soft)] overflow-hidden">
                      {al.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={al.cover}
                          alt={al.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      )}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-xs">
                        사진 {al.count}
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-[var(--color-ink-mute)] mb-0.5">
                        {al.eventDate
                          ? al.eventDate.replace(/-/g, ".")
                          : al.year ?? ""}
                      </div>
                      <div className="text-sm leading-snug line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
                        {al.name}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
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
