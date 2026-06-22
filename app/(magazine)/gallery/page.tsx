import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  listCategories,
  listPhotos,
  listPhotosByCategory,
} from "@/lib/public-cache";
import { PageHeroBg } from "@/components/PageHeroBg";
import { PhotoGrid } from "@/components/PhotoGrid";

export const metadata = {
  title: "갤러리 — 영가회 아카이브",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const user = await getCurrentUser();

  const categories = await listCategories();

  // 비회원에게는 public만 노출
  const visibility = user ? undefined : "public";

  let photos: Awaited<ReturnType<typeof listPhotos>>;
  if (category) {
    // 카테고리 필터
    const cat = categories.find((c) => c.slug === category);
    if (cat) {
      const allInCat = await listPhotosByCategory(category);
      photos = user ? allInCat : allInCat.filter((p) => p.visibility === "public");
    } else {
      photos = [];
    }
  } else {
    photos = await listPhotos(visibility ? { visibility } : undefined);
  }

  const activeCategory = category ? categories.find((c) => c.slug === category) : null;

  return (
    <>
      {/* 히어로 */}
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-20">
        <PageHeroBg page="gallery" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            GALLERY · 寫眞 アーカイブ
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6 max-w-3xl">
            영가회의<br />사진 기록
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            모임과 행사에서 남긴 사진을 한자리에 모았습니다.
            {!user && (
              <span>
                {" "}
                <Link href="/login" className="underline hover:text-[var(--color-accent)]">
                  로그인
                </Link>
                하시면 회원 전용 사진도 볼 수 있습니다.
              </span>
            )}
          </p>
        </div>
      </section>

      {/* 카테고리 탭 + 사진 그리드 */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-6">
          {/* 탭 */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-[var(--color-rule)]">
              <Link
                href="/gallery"
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  !category
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                }`}
              >
                전체
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/gallery?category=${cat.slug}`}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    category === cat.slug
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                  }`}
                >
                  {cat.name}
                  {cat.photo_count !== undefined && cat.photo_count > 0 && (
                    <span className="opacity-60 text-xs">{cat.photo_count}</span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* 현재 카테고리 타이틀 */}
          {activeCategory && (
            <div className="mb-6">
              <h2 className="display-md text-2xl sm:text-3xl">{activeCategory.name}</h2>
              {activeCategory.description && (
                <p className="text-[var(--color-ink-soft)] mt-2">{activeCategory.description}</p>
              )}
            </div>
          )}

          <PhotoGrid photos={photos} initialCategory={category} />
        </div>
      </section>

      {/* 카테고리 카드 섹션 (카테고리가 있고, 전체 보기일 때) */}
      {!category && categories.length > 0 && (
        <section className="py-12 sm:py-16 bg-[var(--color-bg-soft)]">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="display-md text-2xl sm:text-3xl mb-8">카테고리별 보기</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/gallery?category=${cat.slug}`}
                  className="group block overflow-hidden rounded-2xl bg-[var(--color-paper)] border border-[var(--color-rule)] hover:border-[var(--color-ink-mute)] transition"
                >
                  <div className="aspect-video relative overflow-hidden bg-[var(--color-bg-soft)]">
                    {cat.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.cover_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-[var(--color-ink-mute)]">
                        🗂️
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--color-ink)]">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-sm text-[var(--color-ink-soft)] mt-1 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                    <p className="text-xs text-[var(--color-ink-mute)] mt-2">
                      {cat.photo_count ?? 0}장
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
