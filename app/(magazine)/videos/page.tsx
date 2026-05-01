import Link from "next/link";
import { listVideos } from "@/lib/videos-db";
import { FeaturedVideo } from "@/components/FeaturedVideo";

export const metadata = {
  title: "영상 — 영가회 아카이브",
};

export const dynamic = "force-dynamic";

export default function VideosPage() {
  const videos = listVideos();
  const featured = videos.find((v) => v.featured);
  const others = videos.filter((v) => v.id !== featured?.id);

  return (
    <>
      <section className="bg-[var(--color-bg-soft)] pt-40 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            VIDEO · 映像 アーカイブ
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6 max-w-3xl">
            영상으로 남기는<br />영가회의 시간
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            모임 풍경, 회원의 짧은 인터뷰, 회상 자료 영상을 한자리에
            모아 두었습니다. 영상은 회원이 보내주시는 대로 차차 채워 갑니다.
          </p>
        </div>
      </section>

      {videos.length === 0 ? (
        <div className="py-32 text-center text-[var(--color-ink-mute)]">
          아직 등록된 영상이 없습니다.
        </div>
      ) : (
        <>
          {featured && (
            <section className="bg-[var(--color-ink)] text-white py-20 sm:py-28">
              <div className="mx-auto max-w-5xl px-6">
                <div className="kicker text-white/60 mb-5">
                  ⭐ 추천 영상
                </div>
                <h2 className="display text-3xl sm:text-5xl mb-6">
                  {featured.title}
                </h2>
                {featured.description && (
                  <p className="text-base sm:text-lg text-white/75 mb-8 max-w-3xl">
                    {featured.description}
                  </p>
                )}
                <FeaturedVideo
                  embedUrl={featured.embed_url}
                  thumbnail={featured.thumbnail_url}
                  title={featured.title}
                />
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section className="py-20 sm:py-28">
              <div className="mx-auto max-w-6xl px-6">
                <h2 className="display-md text-2xl sm:text-3xl mb-8">
                  전체 영상
                </h2>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {others.map((v) => (
                    <li key={v.id}>
                      <a
                        href={v.embed_url.replace("/embed/", "/watch?v=")}
                        target="_blank"
                        rel="noreferrer"
                        className="group block"
                      >
                        <div className="aspect-video rounded-xl overflow-hidden bg-[var(--color-bg-deep)] mb-3 relative">
                          {v.thumbnail_url ? (
                            <img
                              src={v.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-[var(--color-ink-mute)] text-4xl">
                              ▶
                            </div>
                          )}
                          <div className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/30 transition">
                            <div className="h-14 w-14 rounded-full bg-white/0 group-hover:bg-white grid place-items-center text-[var(--color-ink)] opacity-0 group-hover:opacity-100 transition">
                              <span className="text-xl ml-0.5">▶</span>
                            </div>
                          </div>
                        </div>
                        {v.kicker && (
                          <div className="kicker text-[var(--color-ink-mute)] mb-1">
                            {v.kicker}
                          </div>
                        )}
                        <div className="display-md text-lg group-hover:text-[var(--color-accent)] transition">
                          {v.title}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
