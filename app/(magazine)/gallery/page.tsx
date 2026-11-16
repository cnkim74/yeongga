import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  listCategories,
  listAlbums,
  listPhotosByCategory,
  groupAlbumsByYear,
} from "@/lib/gallery-db";
import { PageHeroBg } from "@/components/PageHeroBg";
import { PhotoGrid } from "@/components/PhotoGrid";
import Image from "next/image";
import { ERAS, eraOfDate } from "@/lib/president-era";
import { presidents } from "@/lib/presidents";

const PRESIDENT_BY_DAE = new Map(presidents.map((p) => [p.dae, p]));

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
  // 숨긴 앨범(옛 회보 지면 앨범 등)은 주소로도 열리지 않는다
  const visibleSlugs = new Set(albums.map((a) => a.slug));
  if (category) {
    const cat = visibleSlugs.has(category) ? categories.find((c) => c.slug === category) : undefined;
    if (cat) {
      const allInCat = await listPhotosByCategory(category);
      photos = user ? allInCat : allInCat.filter((p) => p.visibility === "public");
    }
  }

  const activeCategory =
    category && visibleSlugs.has(category) ? categories.find((c) => c.slug === category) : null;
  // 사진이 아직 없는 앨범은 갤러리에 내보이지 않는다.
  // (관리자 화면에는 그대로 보여, 사진을 올릴 자리로 쓴다)
  // 회장기별로 묶는다 — 행사 장과 같은 구분. 행사 날짜가 없으면 그해 7월 1일로 본다.
  const shown = albums.filter((a) => a.photo_count > 0);
  const eraGroups = ERAS.map((era) => ({
    era,
    albums: shown.filter((al) => {
      const d = al.event_date ?? (al.year ? `${al.year}-07-01` : null);
      return d ? eraOfDate(d)?.dae === era.dae : false;
    }),
  }))
    .filter((g) => g.albums.length > 0)
    .sort((x, y) => y.era.dae - x.era.dae)
    .map((g) => ({
      ...g,
      years: groupAlbumsByYear(g.albums),
      photo_count: g.albums.reduce((n, al) => n + al.photo_count, 0),
    }));
  // 회장기에 들지 못한 앨범(날짜가 없는 것)은 따로 두지 않는다 — 정리 대상

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
          {/* 회장 바로가기 — 행사 장과 같은 사진 카드 (1대 → 9대) */}
          {!category && eraGroups.length > 0 && (
            <nav aria-label="회장기 바로가기" className="mb-12 pb-8 border-b border-[var(--color-rule)]">
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
                {[...eraGroups].reverse().map((g) => {
                  const p = PRESIDENT_BY_DAE.get(g.era.dae);
                  return (
                    <li key={g.era.dae}>
                      <a href={`#${g.era.id}`} className="group block text-center">
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
                          <span className="font-semibold">{g.era.dae}대</span> {g.era.name}
                        </span>
                        <span className="block text-xs text-[var(--color-ink-mute)]">
                          사진 {g.photo_count}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
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
              <PhotoGrid photos={photos} initialCategory={category} showCaptions />
            </>
          ) : (
            /* 첫 화면 — 연도로 묶고, 그 아래 행사별 앨범 카드 */
            <>
              {albums.length === 0 ? (
                <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
                  아직 등록된 앨범이 없습니다.
                </div>
              ) : (
                <div className="space-y-20">
                  {eraGroups.map((eg) => {
                    const p = PRESIDENT_BY_DAE.get(eg.era.dae);
                    return (
                      <section key={eg.era.dae} id={eg.era.id} className="scroll-mt-28">
                        {/* 회장기 머리 — 사진·이름·재임기간 */}
                        <div className="mb-8 flex items-end gap-5 border-b-2 border-[var(--color-ink)] pb-4">
                          {p?.photo && (
                            <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] shadow-sm sm:w-24">
                              <Image
                                src={p.photo}
                                alt={`제${eg.era.dae}대 ${eg.era.name} 회장`}
                                fill
                                sizes="96px"
                                className="object-cover object-top"
                              />
                            </div>
                          )}
                          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
                            <h2 className="display-md text-2xl sm:text-3xl">
                              제{eg.era.dae}대 {eg.era.name}
                              {p?.hanja && (
                                <span className="ml-2 text-lg font-normal text-[var(--color-ink-mute)] sm:text-xl">
                                  {p.hanja}
                                </span>
                              )}
                            </h2>
                            <span className="text-[var(--color-ink-mute)]">{eg.era.term}</span>
                            <span className="ml-auto text-sm text-[var(--color-ink-mute)]">
                              앨범 {eg.albums.length} · 사진 {eg.photo_count}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-10">
                          {eg.years.map((g) => (
                            <div key={g.year ?? "etc"}>
                              <div className="flex items-baseline gap-3 mb-4">
                                <h3 className="text-xl font-semibold text-[var(--color-ink)]">
                                  {g.year ? `${g.year}년` : "연도 미정"}
                                </h3>
                                <span className="text-sm text-[var(--color-ink-mute)]">
                                  앨범 {g.albums.length} · 사진 {g.photo_count}
                                </span>
                              </div>
                          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {g.albums.map((al) => (
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
                                  {al.event_date && (
                                    <div className="text-xs text-[var(--color-ink-mute)] mb-1">
                                      {al.event_date.replace(/-/g, ".")}
                                    </div>
                                  )}
                                  <h3 className="display-md text-lg mb-1 group-hover:text-[var(--color-accent)] transition-colors">
                                    {al.name}
                                  </h3>
                                  {al.description && (
                                    <p className="text-sm text-[var(--color-ink-soft)] line-clamp-2">
                                      {al.description}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
