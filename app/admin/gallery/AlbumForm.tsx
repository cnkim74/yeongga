"use client";

import { useRef, useState, useTransition } from "react";
import { createAlbumAction, updateAlbumAction } from "./actions";

type Img = { image_url: string; file_name?: string };

export function AlbumForm({
  album,
  existingImages = [],
  defaultVisibility = "public",
}: {
  album?: { id: number; name: string; slug: string; description: string | null };
  existingImages?: Img[];
  defaultVisibility?: "public" | "members-only";
}) {
  const isEdit = Boolean(album);
  const [images, setImages] = useState<Img[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function uploadOne(file: File): Promise<Img> {
    try {
      const { uploadToR2 } = await import("@/lib/r2-client");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await uploadToR2(safeName, file, {
        handleUploadUrl: "/api/upload/photo",
        contentType: file.type || "image/jpeg",
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      return { image_url: blob.url, file_name: file.name };
    } catch {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "업로드 실패");
      return { image_url: json.url, file_name: file.name };
    }
  }

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError(`${file.name} — 이미지 파일만 업로드할 수 있습니다.`);
          continue;
        }
        setProgress(0);
        const img = await uploadOne(file);
        setImages((prev) => [...prev, img]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function move(i: number, dir: -1 | 1) {
    setImages((prev) => {
      const to = i + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function remove(url: string) {
    setImages((prev) => prev.filter((im) => im.image_url !== url));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("images", JSON.stringify(images));
    if (album) fd.set("id", String(album.id));
    startTransition(async () => {
      const result = isEdit ? await updateAlbumAction(fd) : await createAlbumAction(fd);
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          앨범 제목 <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          defaultValue={album?.name}
          required
          className="notion-input w-full"
          placeholder="예: 2025 정기총회"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          설명
        </label>
        <textarea
          name="description"
          defaultValue={album?.description ?? ""}
          rows={3}
          className="notion-input w-full resize-none"
          placeholder="앨범에 대한 간단한 설명 (갤러리 카드에 표시됩니다)"
        />
      </div>

      {/* 사진 업로드 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          사진
        </label>
        {images.length > 0 && (
          <div className="mb-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((im, i) => (
              <div
                key={im.image_url}
                className="relative rounded-lg overflow-hidden border border-[var(--color-notion-rule)] group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.image_url} alt="" className="w-full aspect-square object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                    대표
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-white px-2 py-1 text-xs disabled:opacity-30"
                    aria-label="앞으로"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(im.image_url)}
                    className="text-white px-2 py-1 text-xs"
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === images.length - 1}
                    className="text-white px-2 py-1 text-xs disabled:opacity-30"
                    aria-label="뒤로"
                  >
                    ▶
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="notion-input w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-accent)] file:text-white file:px-3 file:py-1 file:text-sm file:cursor-pointer"
        />
        {uploading && (
          <div className="mt-2 text-xs text-[var(--color-notion-mute)]">
            업로드 중… {progress > 0 ? `${progress}%` : ""}
          </div>
        )}
        <p className="mt-1 text-xs text-[var(--color-notion-mute)]">
          여러 장 한 번에 선택 가능. ◀▶로 순서를 바꾸면 맨 앞 사진이 대표(커버)가 됩니다.
        </p>
      </div>

      {/* 공개 범위 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          공개 범위
        </label>
        <select name="visibility" defaultValue={defaultVisibility} className="notion-input w-full">
          <option value="public">전체 공개</option>
          <option value="members-only">회원 전용</option>
        </select>
      </div>

      {/* 슬러그 (선택) */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          주소(슬러그) <span className="text-[var(--color-notion-mute)] font-normal">— 비우면 자동 생성</span>
        </label>
        <input
          name="slug"
          defaultValue={album?.slug}
          className="notion-input w-full font-mono text-sm"
          placeholder="예: 2025-chonghoe"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
        >
          {isPending ? "저장 중…" : isEdit ? "앨범 저장" : "앨범 만들기"}
        </button>
        <a href="/admin/gallery" className="notion-icon-btn px-4 py-2">
          취소
        </a>
      </div>
    </form>
  );
}
