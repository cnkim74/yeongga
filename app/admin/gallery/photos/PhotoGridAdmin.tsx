"use client";

import { deletePhotoAction } from "../actions";
import type { Photo } from "@/lib/gallery-db";

export function PhotoGridAdmin({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return (
      <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
        <div className="text-5xl mb-3">📷</div>
        <div className="text-base font-medium mb-1">아직 사진이 없습니다</div>
        <div className="text-sm text-[var(--color-notion-mute)]">
          위의 업로드 폼을 이용해 첫 번째 사진을 추가해 보세요.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">사진 목록 ({photos.length})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative border border-[var(--color-notion-rule)] rounded-lg overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.image_url}
              alt={photo.title ?? ""}
              className="w-full aspect-square object-cover"
            />
            <div className="p-2">
              {photo.title && (
                <p className="text-xs font-medium truncate">{photo.title}</p>
              )}
              <p className="text-xs text-[var(--color-notion-mute)] truncate">
                {photo.category_name ?? "미분류"}
                {photo.visibility === "members-only" && " 🔒"}
              </p>
            </div>
            {/* 삭제 버튼 */}
            <form
              action={deletePhotoAction}
              onSubmit={(e) => {
                if (!confirm("이 사진을 삭제할까요? 되돌릴 수 없습니다.")) {
                  e.preventDefault();
                }
              }}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
            >
              <input type="hidden" name="id" value={photo.id} />
              <button
                type="submit"
                className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-700 transition"
                title="삭제"
              >
                ✕
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
