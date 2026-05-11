"use client";

import { useState } from "react";
import { BannerForm } from "./BannerForm";
import { deleteBannerAction } from "./actions";
import type { MemberBanner } from "@/lib/banners-db";

export function BannerListClient({ banners }: { banners: MemberBanner[] }) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div>
      {!showNew && (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="mb-6 px-4 py-2 rounded-md bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90"
        >
          + 새 배너 추가
        </button>
      )}

      {showNew && (
        <div className="mb-6 rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] p-5">
          <h3 className="font-medium mb-4">새 배너 추가</h3>
          <BannerForm onDone={() => setShowNew(false)} />
        </div>
      )}

      {banners.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--admin-rule)] bg-[var(--admin-surface)] p-12 text-center">
          <div className="text-3xl mb-2 select-none">廣</div>
          <div className="text-sm font-medium mb-1">등록된 배너가 없습니다</div>
          <div className="text-xs text-[var(--admin-mute)]">
            위의 &quot;새 배너 추가&quot; 버튼을 눌러 첫 배너를 등록해 보세요.
          </div>
        </div>
      ) : (
        <ul className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] divide-y divide-[var(--admin-rule-soft)]">
          {banners.map((b) => (
            <li key={b.id}>
              {editingId === b.id ? (
                <div className="p-5 bg-[var(--admin-bg)]">
                  <h3 className="font-medium text-sm mb-4">수정: {b.title}</h3>
                  <BannerForm banner={b} onDone={() => setEditingId(null)} />
                </div>
              ) : (
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="shrink-0 w-16 h-10 rounded overflow-hidden bg-[var(--admin-bg)] border border-[var(--admin-rule)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!b.active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--admin-bg)] text-[var(--admin-mute)]">
                          숨김
                        </span>
                      )}
                      <span className="font-medium truncate">{b.title}</span>
                    </div>
                    {b.subtitle && (
                      <p className="text-xs text-[var(--admin-mute)] truncate">
                        {b.subtitle}
                      </p>
                    )}
                    <div className="text-[11px] text-[var(--admin-mute)] mt-0.5 font-mono truncate">
                      → {b.link_url}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[var(--admin-mute)] font-mono">
                      pos={b.position}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingId(b.id)}
                      className="text-xs px-2 py-1 rounded border border-[var(--admin-rule)] hover:bg-[var(--admin-hover)]"
                    >
                      편집
                    </button>
                    <form
                      action={deleteBannerAction}
                      onSubmit={(e) => {
                        if (!confirm(`"${b.title}" 배너를 삭제할까요?`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="id" value={b.id} />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded border border-[var(--admin-rule)] text-red-600 hover:bg-red-50"
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
