"use client";

import Link from "next/link";
import { deleteAlbumAction } from "./actions";
import type { Album } from "@/lib/gallery-db";

export function GalleryAlbumList({ albums }: { albums: Album[] }) {
  return (
    <div>
      <Link
        href="/admin/gallery/album/new"
        className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] mb-8 inline-block"
      >
        + 새 앨범 만들기
      </Link>

      {albums.length === 0 ? (
        <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
          <div className="text-5xl mb-3">🖼️</div>
          <div className="text-base font-medium mb-1">아직 앨범이 없습니다</div>
          <div className="text-sm text-[var(--color-notion-mute)]">
            &quot;새 앨범 만들기&quot;로 제목·설명과 사진을 한 번에 올려 보세요.
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((al) => (
            <div
              key={al.id}
              className="rounded-xl border border-[var(--color-notion-rule)] overflow-hidden"
            >
              <Link href={`/admin/gallery/album/${al.id}/edit`} className="block">
                <div className="relative aspect-[4/3] bg-[var(--color-notion-hover)] overflow-hidden">
                  {al.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={al.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-[var(--color-notion-mute)]">
                      🖼️
                    </div>
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-xs">
                    {al.photo_count}장
                  </span>
                </div>
              </Link>
              <div className="p-3">
                <div className="font-medium truncate">{al.name}</div>
                {al.description && (
                  <p className="text-sm text-[var(--color-notion-mute)] line-clamp-2 mt-0.5">
                    {al.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    href={`/admin/gallery/album/${al.id}/edit`}
                    className="notion-icon-btn text-xs"
                  >
                    편집
                  </Link>
                  <Link
                    href={`/gallery?category=${al.slug}`}
                    target="_blank"
                    className="notion-icon-btn text-xs"
                  >
                    보기 ↗
                  </Link>
                  <form
                    action={deleteAlbumAction}
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `"${al.name}" 앨범과 사진 ${al.photo_count}장을 모두 삭제할까요? 되돌릴 수 없습니다.`
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                    className="ml-auto"
                  >
                    <input type="hidden" name="id" value={al.id} />
                    <button
                      type="submit"
                      className="notion-icon-btn text-xs text-[#c4554d] hover:bg-[#ffe2dd]"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
