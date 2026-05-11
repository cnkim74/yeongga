"use client";

import { useState, useTransition } from "react";
import { createBannerAction, updateBannerAction } from "./actions";
import type { MemberBanner } from "@/lib/banners-db";

export function BannerForm({
  banner,
  onDone,
}: {
  banner?: MemberBanner;
  onDone?: () => void;
}) {
  const isEdit = Boolean(banner);
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/banner", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) setError(json.error ?? "업로드 실패");
      else setImageUrl(json.url);
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("image_url", imageUrl);
    if (banner) fd.set("id", String(banner.id));

    startTransition(async () => {
      const result = isEdit
        ? await updateBannerAction(fd)
        : await createBannerAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium mb-1.5">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          defaultValue={banner?.title}
          required
          className="notion-input w-full"
          placeholder="회사명 또는 배너 제목"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5">부제</label>
        <input
          name="subtitle"
          defaultValue={banner?.subtitle ?? ""}
          className="notion-input w-full"
          placeholder="간단한 한 줄 소개 (선택)"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5">
          링크 URL <span className="text-red-500">*</span>
        </label>
        <input
          name="link_url"
          type="url"
          defaultValue={banner?.link_url}
          required
          className="notion-input w-full font-mono text-sm"
          placeholder="https://example.com"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5">
          배너 이미지 <span className="text-red-500">*</span>
        </label>
        {imageUrl && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-16 rounded border border-[var(--admin-rule)]"
            />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="text-xs text-red-600 hover:underline"
            >
              제거
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImage(f);
          }}
          className="text-sm w-full file:mr-3 file:rounded file:border-0 file:bg-[var(--admin-hover)] file:px-3 file:py-1 file:text-sm file:cursor-pointer"
        />
        {uploading && (
          <p className="mt-1 text-xs text-[var(--admin-mute)]">업로드 중…</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1.5">순서</label>
          <input
            name="position"
            type="number"
            defaultValue={banner?.position ?? 0}
            className="notion-input w-full"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              value="1"
              defaultChecked={banner?.active !== false}
            />
            활성화
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading || !imageUrl}
          className="px-4 py-2 rounded-md bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "저장 중…" : isEdit ? "수정 저장" : "배너 추가"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 rounded-md border border-[var(--admin-rule)] text-sm hover:bg-[var(--admin-hover)]"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
