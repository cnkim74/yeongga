import Link from "next/link";
import Image from "next/image";
import { HeroSlider, type HeroSlide } from "@/components/HeroSlider";
import { ChapterIcon } from "@/components/ChapterIcon";
import { FeaturedVideo } from "@/components/FeaturedVideo";
import { chapters, CHAPTER_COUNT_KO, isBlindedHref } from "@/lib/chapters";
import { listActiveSlides } from "@/lib/slides-db";
import { getFeaturedVideo } from "@/lib/videos-db";
import { listHomeChapterDisplays } from "@/lib/chapter-meta-db";
import { listActiveBanners } from "@/lib/banners-db";
import { PageHeroBg } from "@/components/PageHeroBg";
import { HIDDEN_ARTICLE_PAGES } from "@/lib/hidden-article-pages";

// 미리 만들어 두고 CDN 이 내주게 한다 (10분마다 새로 만듦).
// 집무실에서 글을 고치면 revalidatePath 로 곧바로 새로 만들어지므로
// 회원이 보는 내용이 늦어지지 않는다.
export const revalidate = 600;

/** 데이터베이스가 잠시 응답하지 않아도 표지는 열려야 한다.
 *  못 읽은 자리는 비워 두고 나머지를 보여 준다. */
async function orEmpty<T>(p: Promise<T>, fallback: T, what: string): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error(`[home] ${what} 를 읽지 못했습니다.`, e);
    return fallback;
  }
}

export default async function HomePage() {
  const [dbSlides, featuredVideo, chapterDisplays, allBanners] = await Promise.all([
    orEmpty(listActiveSlides(), [], "슬라이드"),
    orEmpty(getFeaturedVideo(), null, "대표 영상"),
    orEmpty(listHomeChapterDisplays(), [], "장 소개"),
    orEmpty(listActiveBanners(), [], "배너"),
  ]);

  // 가린 장(자취·향)으로 가는 슬라이드·배너는 빼고 보여 준다
  const banners = allBanners.filter((b) => !b.link_url || !isBlindedHref(b.link_url));
  const slides: HeroSlide[] = dbSlides
    .filter((s) => !s.href || !isBlindedHref(s.href))
    .map((s) => ({
    id: `db-${s.id}`,
    kicker: s.kicker ?? "",
    title: s.title,
    excerpt: s.excerpt ?? "",
    image: s.image_path,
    href: s.href,
    cta: s.cta ?? undefined,
  }));

  // 메타에 visible=true 이지만 articles이 없는 챕터는 자동으로 빼고,
  // article 있는 챕터만 쇼케이스로 노출
  // 다른 페이지로 연결되는 장(영가상 등)은 글 없이 장 소개와 연결 단추로 보인다.
  const showcases = chapterDisplays
    .map((d) => ({
      chapter: chapters.find((c) => c.slug === d.meta.chapter_slug),
      meta: d.meta,
      latest: d.article,
    }))
    .filter(
      (s): s is typeof s & { chapter: NonNullable<typeof s.chapter> } =>
        !!s.chapter && (s.latest != null || !!s.chapter.href),
    );
  // 추천 영상은 '영상' 장 소개 자리에 넣는다 — 그 장이 쇼케이스에 없으면(표지 이미지 미등록 등) 장 순서 자리에 끼운다
  const videoChapter = chapters.find((c) => c.href === "/videos");
  if (featuredVideo && videoChapter && !showcases.some((s) => s.chapter.slug === videoChapter.slug)) {
    const at = showcases.findIndex(
      (s) => chapters.indexOf(s.chapter) > chapters.indexOf(videoChapter)
    );
    const entry = {
      chapter: videoChapter,
      meta: { chapter_slug: videoChapter.slug, cover_image: null } as (typeof showcases)[number]["meta"],
      latest: null,
    } as (typeof showcases)[number];
    showcases.splice(at < 0 ? showcases.length : at, 0, entry);
  }

  return (
    <>
      {/* 1. HERO — full bleed */}
      <HeroSlider slides={slides} />

      {/* 2. CATEGORY GRID — "Wise의 제품들" 톤 */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <PageHeroBg page="home" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <h2 className="display-md text-3xl sm:text-5xl">
              영가회의 {CHAPTER_COUNT_KO} 장
            </h2>
            <Link
              href="/archive"
              className="text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] underline underline-offset-4"
            >
              전체 아카이브 보기 →
            </Link>
          </div>

          {/* 장 수가 3의 배수가 아니어도 마지막 줄이 가운데 오도록 flex 로 놓는다
              (좁은 화면 3칸, 넓은 화면 4칸 — 7장이면 4+3) */}
          <ul className="flex flex-wrap justify-center gap-y-1 sm:gap-y-4">
            {chapters.map((c) => (
              <li key={c.slug} className="w-1/3 px-0.5 sm:px-2 lg:w-1/4">
                {c.comingSoon ? (
                  <div className="flex flex-col items-center text-center px-2 py-5 sm:p-8 rounded-2xl opacity-40 cursor-default">
                    <ChapterIcon
                      slug={c.slug}
                      className="w-12 h-12 sm:w-20 sm:h-20 text-[var(--color-ink-soft)] mb-5"
                    />
                    <div className="text-xs text-[var(--color-ink-mute)] mb-1 font-mono">
                      {c.number}
                    </div>
                    <div className="display-md text-lg sm:text-xl mb-1 [word-break:keep-all]">
                      {c.title}
                    </div>
                    <div className="text-xs text-[var(--color-ink-mute)]">
                      準備中
                    </div>
                  </div>
                ) : (
                  <Link
                    href={c.href ?? `/archive/${c.slug}`}
                    className="group flex flex-col items-center text-center px-2 py-5 sm:p-8 rounded-2xl hover:bg-[var(--color-bg-soft)] transition"
                  >
                    <ChapterIcon
                      slug={c.slug}
                      className="w-12 h-12 sm:w-20 sm:h-20 text-[var(--color-ink-soft)] mb-5 group-hover:text-[var(--color-ink)] transition"
                    />
                    <div className="text-xs text-[var(--color-ink-mute)] mb-1 font-mono">
                      {c.number}
                    </div>
                    <div className="display-md text-lg sm:text-xl mb-1 [word-break:keep-all]">
                      {c.title}
                    </div>
                    <div className="text-xs text-[var(--color-ink-mute)]">
                      {c.subtitle}
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2.5 추천 영상은 따로 두지 않고 아래 '영상' 장 소개 자리에 넣는다 (2026-11-26, 중복 정리) */}

      {/* 3. ALTERNATING SHOWCASES — chapter_meta 의 cover_image 우선, 글 cover 차순위 */}
      {showcases.map(({ chapter, meta, latest }, i) => {
        const reversed = i % 2 === 1;
        const bg = i % 2 === 0 ? "bg-[var(--color-bg-soft)]" : "bg-white";
        // cover 우선순위: chapter_meta.cover_image > article.cover > 챕터 아이콘 placeholder
        const coverSrc = meta.cover_image || latest?.cover || null;
        // 글 없는 장(영가상 등)은 그 장의 페이지로, 비공개 글은 전용 페이지(회장 인사말 등)로
        const chapterHref = chapter.href ?? `/archive/${chapter.slug}`;
        // '영상' 장(→ /videos)에는 메인 추천 영상을 그 자리에서 바로 보여 준다
        const video = chapter.href === "/videos" ? featuredVideo : null;
        const articleHref = !latest
          ? chapterHref
          : latest.hidden
            ? HIDDEN_ARTICLE_PAGES[`${chapter.slug}/${latest.slug}`] ?? chapterHref
            : `/archive/${chapter.slug}/${latest.slug}`;
        return (
          <section key={chapter.slug} className={`${bg} py-24 sm:py-32`}>
            <div
              className={`mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                reversed ? "lg:[direction:rtl]" : ""
              }`}
            >
              <div className={reversed ? "lg:[direction:ltr]" : ""}>
                {video ? (
                  <FeaturedVideo
                    embedUrl={video.embed_url}
                    thumbnail={video.thumbnail_url}
                    title={video.title}
                  />
                ) : (
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-[var(--color-bg-deep)]">
                  {coverSrc ? (
                    <Image
                      src={coverSrc}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 540px, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    /* 이미지 없을 때 — 챕터 아이콘 + 한자 번호 */
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-[var(--color-ink-mute)] bg-gradient-to-br from-[var(--color-bg-soft)] to-[var(--color-bg-deep)]">
                      <ChapterIcon
                        slug={chapter.slug}
                        className="w-24 h-24 opacity-30"
                      />
                      <div
                        className="font-serif text-7xl opacity-20 select-none"
                        aria-hidden="true"
                      >
                        {chapter.number}
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
              <div className={`max-w-lg ${reversed ? "lg:[direction:ltr]" : ""}`}>
                {/* 2026-11-27 요청 — 먼저 장 안내문, 그 아래 이 장에 실린 글(영상) 한 편을 '참고'로 소개 */}
                <div className="kicker text-[var(--color-ink-mute)] mb-4">
                  {chapter.number}. {chapter.title}
                </div>
                <Link href={chapterHref} className="group block">
                  <h3 className="display-md text-3xl sm:text-5xl mb-5 [word-break:keep-all] group-hover:text-[var(--color-accent)] transition">
                    {chapter.subtitle}
                  </h3>
                </Link>
                <p className="text-base sm:text-lg leading-relaxed text-[var(--color-ink-soft)] mb-8 [word-break:keep-all]">
                  {chapter.description}
                </p>
                {(video || latest) && (
                  <Link
                    href={video ? chapterHref : articleHref}
                    className={`group block rounded-2xl border border-[var(--color-rule)] p-5 sm:p-6 mb-8 hover:border-[var(--color-ink-mute)] transition ${
                      i % 2 === 0 ? "bg-white" : "bg-[var(--color-bg-soft)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3 text-sm text-[var(--color-ink-mute)]">
                      <span className="rounded-full bg-[var(--color-ink)] px-3 py-0.5 text-sm font-medium text-white">
                        참고
                      </span>
                      <span>{video ? "추천 영상" : "이 장에 실린 글"}</span>
                      {video?.kicker && <span>· {video.kicker}</span>}
                    </div>
                    <div className="text-xl sm:text-2xl font-medium leading-snug mb-2 [word-break:keep-all] group-hover:text-[var(--color-accent)] transition">
                      {video ? video.title : latest!.title}
                    </div>
                    {(video ? video.description : latest!.excerpt) && (
                      <p className="text-base leading-relaxed text-[var(--color-ink-soft)] line-clamp-3">
                        {video ? video.description : latest!.excerpt}
                      </p>
                    )}
                    {latest && !video && (
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[var(--color-ink-mute)] mt-3">
                        <span>{formatDate(latest.date)}</span>
                        {latest.author && <span>글 · {latest.author}</span>}
                      </div>
                    )}
                  </Link>
                )}
                <div className="flex gap-3 flex-wrap">
                  <Link href={chapterHref} className="btn-pill">
                    {chapter.linkLabel ?? `${chapter.title} 보기`}{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                  {latest && !video && (
                    <Link href={articleHref} className="btn-pill ghost">
                      참고 글 읽기
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* 4. MEMBER BANNERS — 회원사 배너링크 */}
      {banners.length > 0 && (
        <section className="bg-[var(--color-bg-soft)] py-20 sm:py-28 border-y border-[var(--color-rule)]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="kicker text-[var(--color-ink-mute)] mb-8 text-center">
              永嘉會 · 회원의 광장
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {banners.map((b) => (
                <li key={b.id}>
                  <a
                    href={b.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-2xl overflow-hidden bg-white border border-[var(--color-rule)] hover:shadow-lg transition-shadow"
                  >
                    <div className="relative aspect-[16/9] bg-[var(--color-bg-deep)] overflow-hidden">
                      <Image
                        src={b.image_url}
                        alt={b.title}
                        fill
                        sizes="(min-width: 1024px) 280px, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-medium text-[var(--color-ink)] truncate">
                        {b.title}
                      </div>
                      {b.subtitle && (
                        <div className="text-xs text-[var(--color-ink-mute)] truncate mt-0.5">
                          {b.subtitle}
                        </div>
                      )}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 4. CLOSING */}
      <section className="surface-tone py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="kicker surface-mute mb-6">永嘉會 · ARCHIVE</div>
          <h2 className="display text-4xl sm:text-6xl mb-8">
            글은 사람의 발자국,<br />
            발자국이 모이면 길이 됩니다.
          </h2>
          <p className="text-base sm:text-lg surface-soft leading-relaxed mb-10">
            영가회는 한 줄의 글, 한 장의 사진을 모아 한 사람의 자리를,
            한 모임의 역사를 기록합니다.
          </p>
          <Link href="/about" className="btn-pill paper">
            영가회 소개 보기
          </Link>
        </div>
      </section>
    </>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
