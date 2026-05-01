"use client";

import { useState } from "react";

export function FeaturedVideo({
  embedUrl,
  thumbnail,
  title,
}: {
  embedUrl: string;
  thumbnail: string | null;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
        <iframe
          src={`${embedUrl}?autoplay=1`}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerated-sensors; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl"
      aria-label={`재생: ${title}`}
    >
      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/10" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/95 grid place-items-center text-[var(--color-ink)] shadow-xl group-hover:scale-110 transition">
          <span className="text-3xl ml-1">▶</span>
        </div>
      </div>
    </button>
  );
}

export function VideoEmbed({
  embedUrl,
  title,
}: {
  embedUrl: string;
  title: string;
}) {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        title={title}
        className="absolute inset-0 w-full h-full"
        allow="accelerated-sensors; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
