import { isUndated } from "@/lib/undated";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChapterIcon } from "@/components/ChapterIcon";
import { ChapterNavStrip } from "@/components/ChapterNavStrip";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { getChapter, chapters } from "@/lib/chapters";
import { listChapterArticles } from "@/lib/articles-db";
import { listAuthorAvatars } from "@/lib/users-db";
import { getChapterMeta } from "@/lib/chapter-meta-db";
import { groupByEra } from "@/lib/president-era";
import { presidents } from "@/lib/presidents";
import { parseByline } from "@/lib/byline";

// 행사 장 회장기 머리에 쓰는 액자 사진 — 역대회장 페이지와 같은 사진
const PRESIDENT_BY_DAE = new Map(presidents.map((p) => [p.dae, p]));

// 빌드 타임 정적 생성 비활성화 (모임 챕터 100+편으로 60초 timeout 회피)
// 매 요청 SSR + Next.js fetch 캐시 활용
// 미리 만들어 두고 CDN 이 내주게 한다 (10분마다 새로 만듦).
// 집무실에서 글을 고치면 revalidatePath 로 곧바로 새로 만들어지므로
// 회원이 보는 내용이 늦어지지 않는다.
export const revalidate = 600;
export const dynamicParams = true;

// 글이 담긴 장은 정해져 있다(사진·영상·회원·영가문화상은 따로 된 페이지). 미리 만들어 두면 CDN 이 곧바로 내준다.
export function generateStaticParams() {
  return chapters.filter((c) => !c.href).map((c) => ({ chapter: c.slug }));
}

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
  // 글 목록은 데이터베이스가 안 되면 저장소 파일에서 읽어 온다(articles-db).
  // 곁들이는 아바타·장 메타는 못 읽어도 목록은 보여 준다.
  const [articles, avatars, chapterMeta] = await Promise.all([
    listChapterArticles(chapter),
    listAuthorAvatars().catch(() => ({}) as Record<string, string>),
    getChapterMeta(chapter).catch(() => null),
  ]);

  const ordered = articles;
  // 행사 장은 연도 대신 회장기로 묶어 보여 준다
  const eraGroups = chapter === "moim" ? groupByEra(ordered) : null;
  const avatarByName = new Map(Object.entries(avatars));

  // 우선순위: 챕터 hero_image (전용) > 메인 쇼케이스 cover_image (호환) > placeholder
  const heroImage = chapterMeta?.hero_image ?? chapterMeta?.cover_image ?? null;

  const renderList = (list: { item: (typeof ordered)[number]; index: number }[]) => (
    <ol className="space-y-12 sm:space-y-16">
              {list.map(({ item: a, index: i }) => (
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
                      {chapter === "geul" ? (
                        // 기고 — 기고글 제목 / 회원 이름 · 직함 / 소제목 / 갈래 · 출처
                        (() => {
                          const by = parseByline(a.subtitle, a.author);
                          const meta = [by.label, by.source].filter(Boolean).join(" · ");
                          return (
                            <div className="mb-3 space-y-1">
                              {by.name && (
                                <div className="text-lg">
                                  <span className="font-semibold text-[var(--color-ink)]">{by.name}</span>
                                  {by.role && (
                                    <span className="ml-2 text-[var(--color-ink-soft)]">{by.role}</span>
                                  )}
                                </div>
                              )}
                              {by.sub && (
                                <div className="text-[var(--color-ink-soft)]">{by.sub}</div>
                              )}
                              {meta && (
                                <div className="text-sm text-[var(--color-ink-mute)]">{meta}</div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        a.subtitle && (
                          <div className="text-[var(--color-ink-mute)] mb-3">
                            {a.subtitle}
                          </div>
                        )
                      )}
                      {a.excerpt && (
                        <p className="text-base sm:text-lg text-[var(--color-ink-soft)] leading-relaxed">
                          {a.excerpt}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[var(--color-ink-mute)]">
                        {!isUndated(chapter, a.slug) && <span>{formatDate(a.date)}</span>}
                        {a.author && chapter !== "geul" && (
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
                        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
                          <Image
                            src={a.cover}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, 33vw"
                            className="object-cover"
                            loading="lazy"
                          />
                        </div>
                      </Link>
                    </div>
                  )}
                </li>
              ))}
    </ol>
  );

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
          {ordered.length === 0 ? (
            <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
              이 장에는 아직 등재된 글이 없습니다.
            </div>
          ) : eraGroups ? (
            <div className="space-y-20">
              {/* 회장기 바로가기 */}
              <nav aria-label="회장기 바로가기" className="-mt-4">
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
                  {eraGroups.map((g) => {
                    const p = PRESIDENT_BY_DAE.get(g.era.dae);
                    return (
                      <li key={`nav-${g.era.dae}`}>
                        <a
                          href={`#${g.era.id}`}
                          className="group block text-center"
                        >
                          <span className="relative mx-auto block aspect-[3/4] w-full max-w-[96px] overflow-hidden rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                            {p?.photo && (
                              <Image
                                src={p.photo}
                                alt={`제${g.era.dae}대 ${g.era.name} 회장`}
                                fill
                                sizes="96px"
                                className="object-cover object-top grayscale-[35%] transition group-hover:grayscale-0"
                              />
                            )}
                          </span>
                          <span className="mt-2 block text-sm leading-tight text-[var(--color-ink-soft)] group-hover:text-[var(--color-ink)]">
                            <span className="font-semibold">{g.era.dae}대</span>{" "}
                            {g.era.name}
                          </span>
                          <span className="block text-xs text-[var(--color-ink-mute)]">
                            {g.items.length}편
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              {eraGroups.map((g) => (
                <section key={g.era.dae} id={g.era.id} className="scroll-mt-28">
                  <div className="mb-8 flex items-end gap-5 border-b-2 border-[var(--color-ink)] pb-4">
                    {PRESIDENT_BY_DAE.get(g.era.dae)?.photo && (
                      <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] shadow-sm sm:w-24">
                        <Image
                          src={PRESIDENT_BY_DAE.get(g.era.dae)!.photo!}
                          alt={`제${g.era.dae}대 ${g.era.name} 회장`}
                          fill
                          sizes="96px"
                          className="object-cover object-top"
                        />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h2 className="display-md text-2xl sm:text-3xl">
                        제{g.era.dae}대 {g.era.name}
                        {PRESIDENT_BY_DAE.get(g.era.dae)?.hanja && (
                          <span className="ml-2 text-lg font-normal text-[var(--color-ink-mute)] sm:text-xl">
                            {PRESIDENT_BY_DAE.get(g.era.dae)!.hanja}
                          </span>
                        )}
                      </h2>
                      <span className="text-[var(--color-ink-mute)]">
                        {g.era.term}
                      </span>
                      <span className="ml-auto text-sm text-[var(--color-ink-mute)]">
                        {g.items.length}편
                      </span>
                    </div>
                  </div>
                  {renderList(g.items)}
                </section>
              ))}
            </div>
          ) : (
            renderList(ordered.map((item, index) => ({ item, index })))
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
