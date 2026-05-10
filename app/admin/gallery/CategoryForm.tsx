"use client";

import { useRef, useState, useTransition } from "react";
import { createCategoryAction, updateCategoryAction } from "./actions";
import type { PhotoCategory } from "@/lib/gallery-db";

interface CategoryFormProps {
  category?: PhotoCategory;
  onDone?: () => void;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function CategoryForm({ category, onDone }: CategoryFormProps) {
  const isEdit = Boolean(category);
  const [coverUrl, setCoverUrl] = useState(category?.cover_url ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(category?.slug));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function uploadCover(file: File) {
    setCoverUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "이미지 업로드에 실패했습니다.");
      } else {
        setCoverUrl(json.url);
      }
    } catch {
      setError("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setCoverUploading(false);
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManual) {
      setSlug(toSlug(e.target.value));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("slug", slug);
    fd.set("cover_url", coverUrl);
    if (category) fd.set("id", String(category.id));

    startTransition(async () => {
      const result = isEdit
        ? await updateCategoryAction(fd)
        : await createCategoryAction(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setCoverUrl("");
      setSlug("");
      setSlugManual(false);
      onDone?.();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          카테고리 이름 <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          defaultValue={category?.name}
          required
          onChange={handleNameChange}
          className="notion-input w-full"
          placeholder="예: 2024년 봄 모임"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          슬러그 (URL용) <span className="text-red-500">*</span>
        </label>
        <input
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
          className="notion-input w-full font-mono text-sm"
          placeholder="예: spring-2024"
          required
        />
        <p className="mt-1 text-xs text-[var(--color-notion-mute)]">
          영문 소문자, 숫자, 하이픈만 사용. 이름 입력 시 자동 생성됩니다.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          설명
        </label>
        <textarea
          name="description"
          defaultValue={category?.description ?? ""}
          rows={2}
          className="notion-input w-full resize-none"
          placeholder="카테고리에 대한 간단한 설명 (선택)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          커버 이미지
        </label>
        {coverUrl && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt="커버 미리보기"
              className="h-16 w-24 object-cover rounded border border-[var(--color-notion-rule)]"
            />
            <button
              type="button"
              onClick={() => setCoverUrl("")}
              className="text-sm text-red-500 hover:text-red-700"
            >
              삭제
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={coverUploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }}
          className="notion-input w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-hover)] file:text-[var(--color-notion-ink)] file:px-3 file:py-1 file:text-sm file:cursor-pointer"
        />
        {coverUploading && (
          <p className="mt-1 text-xs text-[var(--color-notion-mute)]">업로드 중...</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          순서 (낮을수록 앞에 표시)
        </label>
        <input
          name="position"
          type="number"
          defaultValue={category?.position ?? 0}
          className="notion-input w-32"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || coverUploading}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
        >
          {isPending ? "저장 중..." : isEdit ? "수정 저장" : "카테고리 추가"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="notion-icon-btn px-4 py-2"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
