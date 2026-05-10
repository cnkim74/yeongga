"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryForm } from "./CategoryForm";
import { deleteCategoryAction } from "./actions";
import type { PhotoCategory } from "@/lib/gallery-db";

export function GalleryCategoryList({ categories }: { categories: PhotoCategory[] }) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">카테고리</h2>
        <div className="flex gap-2">
          <Link
            href="/admin/gallery/photos"
            className="notion-icon-btn text-sm"
          >
            모든 사진 관리 →
          </Link>
          {!showNew && (
            <button
              onClick={() => setShowNew(true)}
              className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] text-sm"
            >
              + 새 카테고리
            </button>
          )}
        </div>
      </div>

      {showNew && (
        <div className="mb-6 rounded-xl border border-[var(--color-notion-rule)] p-6 bg-[var(--color-notion-hover)]">
          <h3 className="text-base font-semibold mb-4">새 카테고리 추가</h3>
          <CategoryForm onDone={() => setShowNew(false)} />
        </div>
      )}

      {categories.length === 0 ? (
        <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
          <div className="text-5xl mb-3">🗂️</div>
          <div className="text-base font-medium mb-1">카테고리가 없습니다</div>
          <div className="text-sm text-[var(--color-notion-mute)]">
            위의 &quot;새 카테고리&quot; 버튼을 눌러 첫 번째 카테고리를 만들어 보세요.
          </div>
        </div>
      ) : (
        <ul className="border border-[var(--color-notion-rule)] rounded-lg divide-y divide-[var(--color-notion-rule)]">
          {categories.map((cat) => (
            <li key={cat.id}>
              {editingId === cat.id ? (
                <div className="p-5 bg-[var(--color-notion-hover)]">
                  <h3 className="text-sm font-semibold mb-4">수정: {cat.name}</h3>
                  <CategoryForm category={cat} onDone={() => setEditingId(null)} />
                </div>
              ) : (
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-notion-hover)] transition">
                  {/* 커버 썸네일 */}
                  <div className="shrink-0 w-16 h-12 rounded overflow-hidden bg-[var(--color-notion-rule)] flex items-center justify-center text-xl">
                    {cat.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.cover_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span aria-hidden="true">🗂️</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{cat.name}</div>
                    <div className="text-xs text-[var(--color-notion-mute)] font-mono mt-0.5">
                      /{cat.slug} · 사진 {cat.photo_count ?? 0}장 · pos={cat.position}
                    </div>
                    {cat.description && (
                      <p className="text-sm text-[var(--color-notion-mute)] truncate mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/gallery/photos?category=${cat.slug}`}
                      className="notion-icon-btn text-xs"
                    >
                      사진 관리
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditingId(cat.id)}
                      className="notion-icon-btn text-xs"
                    >
                      편집
                    </button>
                    <form
                      action={deleteCategoryAction}
                      onSubmit={(e) => {
                        if (!confirm(`"${cat.name}" 카테고리를 삭제할까요? 사진은 미분류로 남습니다.`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="id" value={cat.id} />
                      <button
                        type="submit"
                        className="notion-icon-btn text-xs text-[#c4554d] hover:bg-[#ffe2dd]"
                      >
                        삭제
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
