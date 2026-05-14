import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChapterIcon } from "@/components/ChapterIcon";
import { ChapterNavStrip } from "@/components/ChapterNavStrip";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { getChapter } from "@/lib/chapters";
import { listChapterArticles } from "@/lib/articles-db";
import { listUsers } from "@/lib/users-db";
import { getChapterMeta } from "@/lib/chapter-meta-db";

// ISR — 첫 요청 시 생성, 1시간 캐시 (글 변경 시 어드민에서 revalidatePath 호출)
// 빌드 타임 SSG 는 챕터별 글 개수가 많아 timeout 위험이 있어 사용 안 함
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const c = getChapter(chapter);
  if (!c) return {};
  return {
    title: `${c.title} — 영가회 아카이브`,
    description: c.description,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const meta = getChapter(chapter);
  if (!meta) notFound();
  const [articles, users, chapterMeta] = await Promise.all([
    listChapterArticles(chapter),
    listUsers(),
    getChapterMeta(chapter),
  ]);
  const avatarByName = new Map(users.map((u) => [u.name, u.avatar_url]));

  // 우선순위: 챕터 hero_image (전용) > 메인 쇼케이스 cover_image (호환) > placeholder
  const heroImage = chapterMeta?.hero_image ?? chapterMeta?.cover_image ?? null;

  return (
    <>
      {/* HERO 헤더 — chapter_meta.cover_image 우선, 없으면 따뜻한 그라데이션 placeholder */}
      <section className="relative pt-40 pb-24 sm:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          {heroImage ? (
            <>
              <Image
                src={heroImage}
                alt=""
                fill
                sizes="100vw"
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
            </>
          ) : (
            /* 이미지 없을 때 — 챕터 분위기에 맞는 따뜻한 먹·종이 그라데이션 */
            <>
              <div
                className="w-full h-full"
                style={{
                  background:
                    "linear-gradient(135deg, #2a2520 0%, #3a3128 35%, #4a3d30 70%, #2a2520 100%)",
                }}
              />
              {/* 좌측 상단 옅은 한자 워터마크 */}
              <div
                aria-hidden="true"
                className="absolute right-8 sm:right-16 bottom-8 sm:bottom-12 font-serif text-white/[0.07] select-none leading-none"
                style={{ fontSize: "clamp(180px, 30vw, 360px)" }}
              >
                {meta.number}
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
            </>
          )}
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 text-white">
          <Link
            href="/archive"
            className="kicker text-white/70 hover:text-white inline-flex items-center gap-2 mb-6"
          >
            ← 아카이브
          </Link>
          <div className="flex items-start gap-6 max-w-3xl">
            <ChapterIcon
              slug={meta.slug}
              className="w-16 h-16 sm:w-20 sm:h-20 text-white/90 shrink-0 mt-1"
            />
            <div>
              <div className="kicker text-white/70 mb-3">
                {meta.number} · {meta.subtitle}
              </div>
              <h1 className="display text-5xl sm:text-7xl mb-5">
                {meta.title}
              </h1>
              <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">
                {meta.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 챕터 네비 스트립 — hero 바로 아래, 다른 챕터로 빠르게 이동 */}
      <ChapterNavStrip current={chapter} />

      {/* 글 목록 */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-6">
          {articles.length === 0 ? (
            <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
              이 장에는 아직 등재된 글이 없습니다.
            </div>
          ) : (
            <ol className="space-y-12 sm:space-y-16">
              {articles.map((a, i) => (
                <li
                  key={a.slug}
                  className="grid gap-3 sm:gap-6 sm:grid-cols-12 items-start"
                >
                  <div className="sm:col-span-2 text-3xl sm:text-4xl text-[var(--color-ink-mute)] font-mono tabular-nums">
                    {String(articles.length - i).padStart(2, "0")}
                  </div>
                  <div className={a.cover ? "sm:col-span-7" : "sm:col-span-10"}>
                    <Link
                      href={`/archive/${chapter}/${a.slug}`}
                      className="group block"
                    >
                      <h2 className="display-md text-2xl sm:text-4xl mb-3 group-hover:text-[var(--color-accent)] transition">
                        {a.visibility === "members-only" && (
                          <span
                            className="inline-block mr-2 text-base align-middle text-[var(--color-ink-mute)]"
                            aria-label="회원 전용"
                            title="회원 전용"
                          >
                            🔒
                          </span>
                        )}
                        {a.title}
                      </h2>
                      {a.subtitle && (
                        <div className="text-[var(--color-ink-mute)] mb-3">
                          {a.subtitle}
                        </div>
                      )}
                      {a.excerpt && (
                        <p className="text-base sm:text-lg text-[var(--color-ink-soft)] leading-relaxed">
                          {a.excerpt}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[var(--color-ink-mute)]">
                        <span>{formatDate(a.date)}</span>
                        {a.author && (
                          <span className="inline-flex items-center gap-2">
                            <span aria-hidden="true">·</span>
                            <AuthorAvatar
                              src={avatarByName.get(a.author)}
                              name={a.author}
                              size={22}
                            />
                            <span>{a.author}</span>
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                  {a.cover && (
                    <div className="sm:col-span-3">
                      <Link href={`/archive/${chapter}/${a.slug}`} tabIndex={-1} aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.cover}
                          alt=""
                          className="w-full aspect-[4/3] object-cover rounded-xl"
                        />
                      </Link>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
