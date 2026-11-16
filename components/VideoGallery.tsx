"use client";

// 영상 목록 — 누르면 유튜브로 나가지 않고 이 페이지 위에 띄워 재생한다 (2026-11-16 요청).
import { useEffect, useState } from "react";

export type GalleryVideo = {
  id: number;
  kicker: string | null;
  title: string;
  description: string | null;
  embed_url: string;
  thumbnail_url: string | null;
};

export function VideoGallery({ videos }: { videos: GalleryVideo[] }) {
  const [active, setActive] = useState<GalleryVideo | null>(null);

  // Esc 로 닫고, 열려 있는 동안 뒤 페이지 스크롤을 막는다
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  const join = (url: string) => `${url}${url.includes("?") ? "&" : "?"}autoplay=1&rel=0`;

  return (
    <>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {videos.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => setActive(v)}
              className="group block w-full text-left"
              aria-label={`재생: ${v.title}`}
            >
              <div className="aspect-video rounded-xl overflow-hidden bg-[var(--color-bg-deep)] mb-3 relative">
                {v.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnail_url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[var(--color-ink-mute)] text-4xl">
                    ▶
                  </div>
                )}
                <div className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/30 transition">
                  <div className="h-14 w-14 rounded-full bg-white/80 group-hover:bg-white grid place-items-center text-[var(--color-ink)] shadow transition">
                    <span className="text-xl ml-0.5">▶</span>
                  </div>
                </div>
              </div>
              {v.kicker && (
                <div className="kicker text-[var(--color-ink-mute)] mb-1">{v.kicker}</div>
              )}
              <div className="display-md text-lg group-hover:text-[var(--color-accent)] transition">
                {v.title}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 sm:p-8"
          onClick={() => setActive(null)}
        >
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-4 text-white">
              <div className="min-w-0">
                {active.kicker && (
                  <div className="kicker text-white/60 mb-1">{active.kicker}</div>
                )}
                <div className="text-lg sm:text-2xl font-semibold leading-snug">{active.title}</div>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="shrink-0 rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
                aria-label="닫기"
              >
                닫기 ✕
              </button>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black shadow-2xl">
              <iframe
                key={active.id}
                src={join(active.embed_url)}
                title={active.title}
                className="absolute inset-0 h-full w-full"
                allow="accelerated-sensors; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {active.description && (
              <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-white/75">
                {active.description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
