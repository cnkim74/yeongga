"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroSlide = {
  id: string;
  kicker: string;       // 작은 라벨 ex. "NEW.", "이번 호"
  title: string;        // 큰 헤드라인
  excerpt: string;      // 한두 줄 카피
  image: string;
  href: string;
  cta?: string;
};

const AUTOPLAY_MS = 7000;

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const go = useCallback(
    (i: number) =>
      setIndex(((i % slides.length) + slides.length) % slides.length),
    [slides.length]
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (paused || reduceMotion.current) return;
    const id = window.setTimeout(() => next(), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, next]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <div
      ref={containerRef}
      className="hero-slider"
      role="region"
      aria-roledescription="슬라이드 쇼"
      aria-label="영가회 표지 슬라이드"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <article
            key={s.id}
            className="hero-slide"
            data-active={active}
            aria-hidden={!active}
            aria-roledescription="슬라이드"
            aria-label={`${i + 1}/${slides.length} — ${s.title}`}
          >
            <img src={s.image} alt="" className="hero-slide-img" />
            <div className="hero-slide-overlay" />
            <div className="hero-slide-text">
              <div className="kicker mb-5 text-white/90">{s.kicker}</div>
              <h2 className="display text-[clamp(36px,6vw,84px)] mb-6">
                {s.title}
              </h2>
              <p
                className="text-base sm:text-lg leading-relaxed mb-8 text-white/85 max-w-xl"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {s.excerpt}
              </p>
              <Link
                href={s.href}
                tabIndex={active ? 0 : -1}
                className="btn-pill invert"
              >
                {s.cta ?? "읽어 보기"}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        );
      })}

      {/* 인디케이터 + 일시정지 — 좌측 하단 */}
      <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-10 z-10 flex items-center gap-4">
        <div className="text-white/85 text-sm font-mono tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </div>
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`${i + 1}번 슬라이드`}
              aria-current={i === index}
              className={`h-1 rounded-full transition-all ${
                i === index
                  ? "w-12 bg-white"
                  : "w-6 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "자동 넘김 시작" : "자동 넘김 멈춤"}
          className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs grid place-items-center backdrop-blur-sm"
        >
          {paused ? "▶" : "❚❚"}
        </button>
      </div>

      {/* 좌우 화살표 — 우측 하단 (WISE처럼 둥근 검은 버튼 안 거슬리게) */}
      <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-10 z-10 flex gap-2">
        <button
          type="button"
          onClick={prev}
          aria-label="이전 슬라이드"
          className="h-12 w-12 rounded-full bg-white/15 hover:bg-white/25 text-white grid place-items-center text-xl backdrop-blur-sm"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="다음 슬라이드"
          className="h-12 w-12 rounded-full bg-white/15 hover:bg-white/25 text-white grid place-items-center text-xl backdrop-blur-sm"
        >
          ›
        </button>
      </div>
    </div>
  );
}
