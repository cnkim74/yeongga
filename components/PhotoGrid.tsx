"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Photo } from "@/lib/gallery-db";

interface PhotoGridProps {
  photos: Photo[];
  initialCategory?: string;
}

/**
 * 갤러리 사진 그리드 + 라이트박스.
 *
 * 디자인 의도:
 * - CSS columns 기반 masonry — 사진 원본 비율을 유지하면서 단일/멀티 컬럼 자연 흐름.
 *   `break-inside-avoid` 로 카드 단위가 컬럼을 가로지르지 않게 함.
 * - 정사각 강제 크롭을 안 함 → 가로 사진은 가로답게, 세로 사진은 세로답게.
 * - 라이트박스는 모바일에서 좌우 패딩을 최소화해 사진이 화면을 가득 차지.
 * - 스와이프 제스처(50px 임계값)로 다음/이전 사진.
 * - prefers-reduced-motion 사용자에겐 페이드인을 끄기.
 */
export function PhotoGrid({ photos, initialCategory }: PhotoGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openPhoto = (index: number) => {
    setSelectedIndex(index);
  };

  const closePhoto = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const prevPhoto = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);

  const nextPhoto = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));
  }, [photos.length]);

  // 키보드 네비게이션
  useEffect(() => {
    if (selectedIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePhoto();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, closePhoto, prevPhoto, nextPhoto]);

  // 라이트박스 스크롤 잠금
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  if (photos.length === 0) {
    return (
      <div className="py-24 text-center text-[var(--color-ink-mute)]">
        {initialCategory
          ? "이 카테고리에 사진이 없습니다."
          : "아직 등록된 사진이 없습니다."}
      </div>
    );
  }

  return (
    <>
      {/* 사진 그리드 — CSS columns masonry */}
      <div className="gallery-masonry">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => openPhoto(index)}
            className="gallery-item group relative block w-full overflow-hidden rounded-lg bg-[var(--color-bg-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
            aria-label={photo.title ?? `사진 ${index + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.image_url}
              alt={photo.title ?? ""}
              className="w-full h-auto block transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            {/* 캡션 오버레이 — 데스크탑은 호버, 모바일은 항상 살짝 보임 */}
            {(photo.title || photo.category_name) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 pt-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition duration-300">
                {photo.title && (
                  <p className="text-white text-xs sm:text-sm font-medium leading-snug line-clamp-2 drop-shadow">
                    {photo.title}
                  </p>
                )}
                {photo.category_name && (
                  <p className="text-white/70 text-[11px] sm:text-xs mt-0.5">
                    {photo.category_name}
                  </p>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 라이트박스 */}
      {selectedPhoto !== null && selectedIndex !== null && (
        <Lightbox
          photo={selectedPhoto}
          index={selectedIndex}
          total={photos.length}
          onClose={closePhoto}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}

      {/* 그리드 + 페이드인 스타일 — 컴포넌트 로컬 */}
      <style>{`
        .gallery-masonry {
          column-count: 2;
          column-gap: 0.5rem;
        }
        @media (min-width: 640px) {
          .gallery-masonry { column-count: 3; column-gap: 0.75rem; }
        }
        @media (min-width: 1024px) {
          .gallery-masonry { column-count: 4; column-gap: 0.75rem; }
        }
        .gallery-item {
          break-inside: avoid;
          margin-bottom: 0.5rem;
          opacity: 0;
          animation: gallery-fade-in 420ms ease-out forwards;
        }
        @media (min-width: 640px) {
          .gallery-item { margin-bottom: 0.75rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gallery-item {
            opacity: 1;
            animation: none;
          }
        }
        @keyframes gallery-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

/* ─── 라이트박스 ─── */

function Lightbox({
  photo,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  photo: Photo;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const sx = touchStartX.current;
    const sy = touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (sx === null || sy === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    // 가로 스와이프가 세로 스와이프보다 충분히 크고, 임계값 50px 넘을 때만 전환
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) onPrev();
    else onNext();
  }

  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-[gallery-lightbox-fade_180ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="사진 보기"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 닫기 버튼 — 우상단, 큰 탭 타깃 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white flex items-center justify-center transition backdrop-blur-sm"
        aria-label="닫기"
      >
        <span aria-hidden="true" className="text-2xl leading-none">✕</span>
      </button>

      {/* 카운터 — 좌상단, 항상 표시 */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium">
        {index + 1} <span className="text-white/50">/ {total}</span>
      </div>

      {/* 이전 버튼 — 데스크탑만 표시 (모바일은 스와이프) */}
      {hasPrev && (
        <button
          type="button"
          onClick={onPrev}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white items-center justify-center transition backdrop-blur-sm"
          aria-label="이전 사진"
        >
          <span aria-hidden="true" className="text-2xl">←</span>
        </button>
      )}

      {/* 다음 버튼 — 데스크탑만 표시 */}
      {hasNext && (
        <button
          type="button"
          onClick={onNext}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white items-center justify-center transition backdrop-blur-sm"
          aria-label="다음 사진"
        >
          <span aria-hidden="true" className="text-2xl">→</span>
        </button>
      )}

      {/* 이미지 + 정보 — 모바일은 화면 가득, 데스크탑은 여유 */}
      <div className="flex flex-col items-center max-w-6xl w-full h-full px-2 sm:px-16 py-16 sm:py-12">
        <div className="flex-1 flex items-center justify-center min-h-0 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.id}
            src={photo.image_url}
            alt={photo.title ?? ""}
            className="max-h-full max-w-full object-contain rounded-md shadow-2xl animate-[gallery-photo-fade_220ms_ease-out]"
            draggable={false}
          />
        </div>
        {(photo.title || photo.category_name || photo.description) && (
          <div className="mt-3 sm:mt-4 text-center max-w-xl shrink-0">
            {photo.title && (
              <p className="text-white font-medium text-base sm:text-lg leading-snug">
                {photo.title}
              </p>
            )}
            {photo.category_name && (
              <p className="text-white/60 text-xs sm:text-sm mt-1">{photo.category_name}</p>
            )}
            {photo.description && (
              <p className="text-white/75 text-xs sm:text-sm mt-2 leading-relaxed">
                {photo.description}
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes gallery-lightbox-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gallery-photo-fade {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="gallery-lightbox-fade"],
          [class*="gallery-photo-fade"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
