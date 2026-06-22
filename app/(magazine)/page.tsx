import Link from "next/link";
import Image from "next/image";
import { HeroSlider, type HeroSlide } from "@/components/HeroSlider";
import { ChapterIcon } from "@/components/ChapterIcon";
import { FeaturedVideo } from "@/components/FeaturedVideo";
import { chapters } from "@/lib/chapters";
import {
  listActiveSlides,
  getFeaturedVideo,
  listHomeChapterDisplays,
  listActiveBanners,
} from "@/lib/public-cache";
import { PageHeroBg } from "@/components/PageHeroBg";

// force-dynamic — 글 수가 늘어나면서 빌드 시 SSG 생성에 60초 초과 timeout 발생.
// /archive/[chapter] 와 동일한 방식으로 요청 시점에 동적 렌더링.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [dbSlides, featuredVideo, chapterDisplays, banners] = await Promise.all([
    listActiveSlides(),
    getFeaturedVideo(),
    listHomeChapterDisplays(),
    listActiveBanners(),
  ]);

  const slides: HeroSlide[] = dbSlides.map((s) => ({
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
  const showcases = chapterDisplays
    .filter((d) => d.article != null)
    .map((d) => {
      const chapter = chapters.find((c) => c.slug === d.meta.chapter_slug)!;
      return {
        chapter,
        meta: d.meta,
        latest: d.article!,
      };
    });

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
              영가회의 여덟 장
            </h2>
            <Link
              href="/archive"
              className="text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] underline underline-offset-4"
            >
              전체 아카이브 보기 →
            </Link>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {chapters.map((c) => (
              <li key={c.slug}>
                {c.comingSoon ? (
                  <div className="flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl opacity-40 cursor-default">
                    <ChapterIcon
                      slug={c.slug}
                      className="w-16 h-16 sm:w-20 sm:h-20 text-[var(--color-ink-soft)] mb-5"
                    />
                    <div className="text-xs text-[var(--color-ink-mute)] mb-1 font-mono">
                      {c.number}
                    </div>
                    <div className="display-md text-lg sm:text-xl mb-1">
                      {c.title}
                    </div>
                    <div className="text-xs text-[var(--color-ink-mute)]">
                      準備中
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/archive/${c.slug}`}
                    className="group flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl hover:bg-[var(--color-bg-soft)] transition"
                  >
                    <ChapterIcon
                      slug={c.slug}
                      className="w-16 h-16 sm:w-20 sm:h-20 text-[var(--color-ink-soft)] mb-5 group-hover:text-[var(--color-ink)] transition"
                    />
                    <div className="text-xs text-[var(--color-ink-mute)] mb-1 font-mono">
                      {c.number}
                    </div>
                    <div className="display-md text-lg sm:text-xl mb-1">
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

      {/* 2.5 FEATURED VIDEO — 메인 추천 영상 */}
      {featuredVideo && (
        <section className="surface-tone py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              <div className="lg:col-span-7">
                <FeaturedVideo
                  embedUrl={featuredVideo.embed_url}
                  thumbnail={featuredVideo.thumbnail_url}
                  title={featuredVideo.title}
                />
              </div>
              <div className="lg:col-span-5">
                <div className="kicker surface-mute mb-4">
                  {featuredVideo.kicker ?? "VIDEO · 추천 영상"}
                </div>
                <h2 className="display text-3xl sm:text-5xl mb-5">
                  {featuredVideo.title}
                </h2>
                {featuredVideo.description && (
                  <p className="text-base sm:text-lg surface-soft leading-relaxed mb-8">
                    {featuredVideo.description}
                  </p>
                )}
                <Link href="/videos" className="btn-pill invert">
                  영상 아카이브 →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. ALTERNATING SHOWCASES — chapter_meta 의 cover_image 우선, 글 cover 차순위 */}
      {showcases.map(({ chapter, meta, latest }, i) => {
        const reversed = i % 2 === 1;
        const bg = i % 2 === 0 ? "bg-[var(--color-bg-soft)]" : "bg-white";
        // cover 우선순위: chapter_meta.cover_image > article.cover > 챕터 아이콘 placeholder
        const coverSrc = meta.cover_image || latest.cover || null;
        return (
          <section key={chapter.slug} className={`${bg} py-24 sm:py-32`}>
            <div
              className={`mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                reversed ? "lg:[direction:rtl]" : ""
              }`}
            >
              <div className={reversed ? "lg:[direction:ltr]" : ""}>
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
              </div>
              <div className={`max-w-lg ${reversed ? "lg:[direction:ltr]" : ""}`}>
                <div className="kicker text-[var(--color-ink-mute)] mb-4">
                  {chapter.number}. {chapter.title}
                </div>
                <Link
                  href={`/archive/${chapter.slug}/${latest.slug}`}
                  className="group block"
                >
                  <h3 className="display-md text-3xl sm:text-5xl mb-5 group-hover:text-[var(--color-accent)] transition">
                    {latest.title}
                  </h3>
                </Link>
                {latest.excerpt && (
                  <p className="text-base sm:text-lg leading-relaxed text-[var(--color-ink-soft)] mb-8">
                    {latest.excerpt}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-ink-mute)] mb-8">
                  <span>{formatDate(latest.date)}</span>
                  {latest.author && <span>글 · {latest.author}</span>}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Link
                    href={`/archive/${chapter.slug}/${latest.slug}`}
                    className="btn-pill"
                  >
                    글 읽기 <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    href={`/archive/${chapter.slug}`}
                    className="btn-pill ghost"
                  >
                    {chapter.title} 더 보기
                  </Link>
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
          <Link href="/about" className="btn-pill invert">
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
