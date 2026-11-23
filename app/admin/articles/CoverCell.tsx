"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GalleryPhotoPicker } from "./GalleryPhotoPicker";
import { setArticleCoverAction } from "./actions";

/**
 * 글 관리 목록의 대표 이미지 칸.
 * 대표 이미지가 있으면 작은 썸네일, 없으면 '사진 란에서 고르기' 칸.
 * 누르면 사진 란(갤러리) 창이 열리고, 고른 사진이 곧바로 대표 이미지가 된다.
 */
export function CoverCell({
  id,
  chapter,
  slug,
  cover,
}: {
  id: number;
  chapter: string;
  slug: string;
  cover: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(cover ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function apply(src: string) {
    setError("");
    start(async () => {
      const r = await setArticleCoverAction({ id, chapter, slug, cover: src });
      if (!r.ok) {
        setError(r.error ?? "저장하지 못했습니다.");
        return;
      }
      setCurrent(src);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className={`relative w-14 h-14 shrink-0 rounded-md overflow-hidden border ${
          current
            ? "border-[var(--color-notion-rule)] hover:border-[var(--color-notion-accent)]"
            : "border-dashed border-[var(--color-notion-rule)] hover:border-[var(--color-notion-accent)] text-[var(--color-notion-mute)] hover:text-[var(--color-notion-accent)]"
        } disabled:opacity-50`}
        title={
          error ||
          (current
            ? "대표 이미지 — 눌러서 사진 란에서 다른 사진으로 바꾸기"
            : "대표 이미지 없음 — 눌러서 사진 란에서 고르기")
        }
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center justify-center h-full text-[10px] leading-tight">
            <span className="text-base leading-none mb-0.5">🖼</span>
            {pending ? "저장 중" : "사진 란"}
          </span>
        )}
        {error && (
          <span className="absolute inset-x-0 bottom-0 bg-red-600 text-white text-[9px]">
            실패
          </span>
        )}
      </button>
      <GalleryPhotoPicker
        open={open}
        mode="cover"
        onClose={() => setOpen(false)}
        onInsert={(photos) => {
          if (photos[0]) apply(photos[0].src);
        }}
      />
    </>
  );
}
