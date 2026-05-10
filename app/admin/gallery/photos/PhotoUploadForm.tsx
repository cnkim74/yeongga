"use client";

import { useRef, useState, useTransition } from "react";
import { createPhotoAction } from "../actions";
import type { PhotoCategory } from "@/lib/gallery-db";

interface PhotoUploadFormProps {
  categories: PhotoCategory[];
  defaultCategorySlug?: string;
}

export function PhotoUploadForm({ categories, defaultCategorySlug }: PhotoUploadFormProps) {
  const defaultCat = categories.find((c) => c.slug === defaultCategorySlug);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        setUploadError(json.error ?? "업로드에 실패했습니다.");
      } else {
        setImageUrl(json.url);
      }
    } catch {
      setUploadError("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!imageUrl) { setError("이미지를 먼저 업로드해 주세요."); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("image_url", imageUrl);

    startTransition(async () => {
      const result = await createPhotoAction(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      // 연속 업로드: 이미지만 초기화, 나머지 폼 필드 유지
      setImageUrl("");
      setError(null);
      setSuccessCount((n) => n + 1);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="rounded-xl border border-[var(--color-notion-rule)] p-6 bg-[var(--color-notion-hover)] mb-8">
      <h2 className="text-base font-semibold mb-4">사진 업로드</h2>

      {successCount > 0 && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successCount}장 업로드 완료. 계속 업로드할 수 있습니다.
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 이미지 파일 선택 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
            이미지 파일 <span className="text-red-500">*</span>
          </label>
          {imageUrl && (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="미리보기"
                className="h-20 w-20 object-cover rounded border border-[var(--color-notion-rule)]"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="text-sm text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
            className="notion-input w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-accent)] file:text-white file:px-3 file:py-1 file:text-sm file:cursor-pointer"
          />
          {uploading && (
            <p className="mt-1 text-xs text-[var(--color-notion-mute)]">업로드 중...</p>
          )}
          {uploadError && (
            <p className="mt-1 text-xs text-red-600">{uploadError}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
              카테고리
            </label>
            <select
              name="category_id"
              defaultValue={defaultCat?.id ?? ""}
              className="notion-input w-full"
            >
              <option value="">미분류</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 공개범위 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
              공개 범위
            </label>
            <select name="visibility" defaultValue="public" className="notion-input w-full">
              <option value="public">전체 공개</option>
              <option value="members-only">회원 전용</option>
            </select>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
            제목
          </label>
          <input
            name="title"
            className="notion-input w-full"
            placeholder="사진 제목 (선택)"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
            설명
          </label>
          <textarea
            name="description"
            rows={2}
            className="notion-input w-full resize-none"
            placeholder="사진 설명 (선택)"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* 촬영일 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
              촬영일
            </label>
            <input
              name="taken_at"
              type="date"
              className="notion-input w-full"
            />
          </div>

          {/* 순서 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
              순서
            </label>
            <input
              name="position"
              type="number"
              defaultValue={0}
              className="notion-input w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isPending || uploading || !imageUrl}
            className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
          >
            {isPending ? "저장 중..." : "사진 추가"}
          </button>
        </div>
      </form>
    </div>
  );
}
