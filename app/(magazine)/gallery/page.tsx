import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  listCategories,
  listAlbums,
  listPhotosByCategory,
} from "@/lib/gallery-db";
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

  // 첫 화면(앨범 카드)용 — 비회원은 공개 사진 기준 커버·개수
  const albums = await listAlbums(!user);

  // 특정 앨범을 열었을 때만 사진 로드
  let photos: Awaited<ReturnType<typeof listPhotosByCategory>> = [];
  if (category) {
    const cat = categories.find((c) => c.slug === category);
    if (cat) {
      const allInCat = await listPhotosByCategory(category);
      photos = user ? allInCat : allInCat.filter((p) => p.visibility === "public");
    }
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
            영가회<span className="text-[0.6em] align-middle opacity-70">(永嘉會)</span>의<br />사진 기록
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

          {category ? (
            <>
              {/* 앨범 상세 — 제목·설명 + 사진 그리드 */}
              {activeCategory && (
                <div className="mb-6">
                  <Link
                    href="/gallery"
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] mb-3"
                  >
                    ← 전체 앨범
                  </Link>
                  <h2 className="display-md text-2xl sm:text-3xl">{activeCategory.name}</h2>
                  {activeCategory.description && (
                    <p className="text-[var(--color-ink-soft)] mt-2">
                      {activeCategory.description}
                    </p>
                  )}
                </div>
              )}
              <PhotoGrid photos={photos} initialCategory={category} />
            </>
          ) : (
            /* 첫 화면 — 앨범 카드 (썸네일 + 제목 + 설명) */
            <>
              {albums.length === 0 ? (
                <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
                  아직 등록된 앨범이 없습니다.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {albums.map((al) => (
                    <Link
                      key={al.id}
                      href={`/gallery?category=${al.slug}`}
                      className="group flex flex-col rounded-2xl border border-[var(--color-rule)] overflow-hidden bg-white hover:shadow-lg transition-shadow"
                    >
                      <div className="relative aspect-[4/3] bg-[var(--color-bg-soft)] overflow-hidden">
                        {al.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={al.cover}
                            alt={al.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-[var(--color-ink-mute)]">
                            🖼️
                          </div>
                        )}
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-xs">
                          사진 {al.photo_count}
                        </span>
                      </div>
                      <div className="flex flex-col flex-1 p-4">
                        <h2 className="display-md text-lg mb-1 group-hover:text-[var(--color-accent)] transition-colors">
                          {al.name}
                        </h2>
                        {al.description && (
                          <p className="text-sm text-[var(--color-ink-soft)] line-clamp-2">
                            {al.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
