import Link from "next/link";
import { HeroSlider, type HeroSlide } from "@/components/HeroSlider";
import { ChapterIcon } from "@/components/ChapterIcon";
import { FeaturedVideo } from "@/components/FeaturedVideo";
import { chapters, getChapterArticles } from "@/lib/content";
import { listActiveSlides } from "@/lib/slides-db";
import { getFeaturedVideo } from "@/lib/videos-db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dbSlides = await listActiveSlides();
  const slides: HeroSlide[] = dbSlides.map((s) => ({
    id: `db-${s.id}`,
    kicker: s.kicker ?? "",
    title: s.title,
    excerpt: s.excerpt ?? "",
    image: s.image_path,
    href: s.href,
    cta: s.cta ?? undefined,
  }));

  const featuredVideo = await getFeaturedVideo();

  // 교차 쇼케이스에 쓸 — 5개 장 중 글이 있는 것만, 최신순
  const showcases = chapters
    .map((c) => ({ chapter: c, latest: getChapterArticles(c.slug)[0] }))
    .filter((x) => x.latest);

  return (
    <>
      {/* 1. HERO — full bleed */}
      <HeroSlider slides={slides} />

      {/* 2. CATEGORY GRID — "Wise의 제품들" 톤 */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <h2 className="display-md text-3xl sm:text-5xl">
              영가회의 다섯 장
            </h2>
            <Link
              href="/archive"
              className="text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] underline underline-offset-4"
            >
              전체 아카이브 보기 →
            </Link>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
            {chapters.map((c) => (
              <li key={c.slug}>
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
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2.5 FEATURED VIDEO — 메인 추천 영상 */}
      {featuredVideo && (
        <section className="bg-[var(--color-ink)] text-white py-24 sm:py-32">
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
                <div className="kicker text-white/60 mb-4">
                  {featuredVideo.kicker ?? "VIDEO · 추천 영상"}
                </div>
                <h2 className="display text-3xl sm:text-5xl mb-5">
                  {featuredVideo.title}
                </h2>
                {featuredVideo.description && (
                  <p className="text-base sm:text-lg text-white/75 leading-relaxed mb-8">
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

      {/* 3. ALTERNATING SHOWCASES — "Wise Pixie" 톤 */}
      {showcases.map(({ chapter, latest }, i) => {
        const reversed = i % 2 === 1;
        const bg = i % 2 === 0 ? "bg-[var(--color-bg-soft)]" : "bg-white";
        return (
          <section key={chapter.slug} className={`${bg} py-24 sm:py-32`}>
            <div
              className={`mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                reversed ? "lg:[direction:rtl]" : ""
              }`}
            >
              <div className={reversed ? "lg:[direction:ltr]" : ""}>
                <div
                  className="aspect-[4/3] rounded-3xl overflow-hidden bg-[var(--color-bg-deep)]"
                >
                  <img
                    src={`/chapters/${chapter.slug}.jpg`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className={`max-w-lg ${reversed ? "lg:[direction:ltr]" : ""}`}>
                <div className="kicker text-[var(--color-ink-mute)] mb-4">
                  {chapter.number}. {chapter.title}
                </div>
                <Link
                  href={`/archive/${chapter.slug}/${latest!.slug}`}
                  className="group block"
                >
                  <h3 className="display-md text-3xl sm:text-5xl mb-5 group-hover:text-[var(--color-accent)] transition">
                    {latest!.title}
                  </h3>
                </Link>
                {latest!.excerpt && (
                  <p className="text-base sm:text-lg leading-relaxed text-[var(--color-ink-soft)] mb-8">
                    {latest!.excerpt}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-ink-mute)] mb-8">
                  <span>{formatDate(latest!.date)}</span>
                  {latest!.author && <span>글 · {latest!.author}</span>}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Link
                    href={`/archive/${chapter.slug}/${latest!.slug}`}
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

      {/* 4. CLOSING */}
      <section className="bg-[var(--color-ink)] text-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="kicker text-white/60 mb-6">永嘉會 · ARCHIVE</div>
          <h2 className="display text-4xl sm:text-6xl mb-8">
            글은 사람의 발자국,<br />
            발자국이 모이면 길이 됩니다.
          </h2>
          <p className="text-base sm:text-lg text-white/75 leading-relaxed mb-10">
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
