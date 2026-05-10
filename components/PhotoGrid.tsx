"use client";

import { useState, useEffect, useCallback } from "react";
import type { Photo } from "@/lib/gallery-db";

interface PhotoGridProps {
  photos: Photo[];
  initialCategory?: string;
}

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
      {/* 사진 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => openPhoto(index)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--color-bg-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label={photo.title ?? `사진 ${index + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.image_url}
              alt={photo.title ?? ""}
              className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* 호버 오버레이 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-3">
              {photo.title && (
                <p className="text-white text-sm font-medium leading-snug line-clamp-2">
                  {photo.title}
                </p>
              )}
              {photo.category_name && (
                <p className="text-white/70 text-xs mt-0.5">{photo.category_name}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 라이트박스 */}
      {selectedPhoto !== null && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="사진 보기"
          onClick={(e) => { if (e.target === e.currentTarget) closePhoto(); }}
        >
          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={closePhoto}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="닫기"
          >
            <span aria-hidden="true" className="text-xl leading-none">✕</span>
          </button>

          {/* 이전 버튼 */}
          {selectedIndex > 0 && (
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="이전 사진"
            >
              <span aria-hidden="true" className="text-xl">←</span>
            </button>
          )}

          {/* 다음 버튼 */}
          {selectedIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="다음 사진"
            >
              <span aria-hidden="true" className="text-xl">→</span>
            </button>
          )}

          {/* 이미지 + 정보 */}
          <div className="flex flex-col items-center max-w-5xl w-full px-16 sm:px-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto.image_url}
              alt={selectedPhoto.title ?? ""}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            {(selectedPhoto.title || selectedPhoto.category_name || selectedPhoto.description) && (
              <div className="mt-4 text-center max-w-xl">
                {selectedPhoto.title && (
                  <p className="text-white font-medium text-lg leading-snug">
                    {selectedPhoto.title}
                  </p>
                )}
                {selectedPhoto.category_name && (
                  <p className="text-white/60 text-sm mt-1">{selectedPhoto.category_name}</p>
                )}
                {selectedPhoto.description && (
                  <p className="text-white/75 text-sm mt-2 leading-relaxed">
                    {selectedPhoto.description}
                  </p>
                )}
              </div>
            )}
            {/* 카운터 */}
            <p className="text-white/40 text-xs mt-3">
              {selectedIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
