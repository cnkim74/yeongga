"use client";

import { useState } from "react";
import Link from "next/link";
import { EbookForm } from "./EbookForm";
import { deleteEbookAction } from "./actions";
import type { Ebook } from "@/lib/ebooks-db";

export function EbookListClient({ ebooks }: { ebooks: Ebook[] }) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div>
      {/* 새 이북 추가 버튼 */}
      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] mb-8"
        >
          + 새 이북 추가
        </button>
      )}

      {/* 새 이북 폼 */}
      {showNew && (
        <div className="mb-8 rounded-xl border border-[var(--color-notion-rule)] p-6 bg-[var(--color-notion-hover)]">
          <h2 className="text-base font-semibold mb-4">새 이북 추가</h2>
          <EbookForm onDone={() => setShowNew(false)} />
        </div>
      )}

      {/* 목록 */}
      {ebooks.length === 0 ? (
        <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
          <div className="text-5xl mb-3">📚</div>
          <div className="text-base font-medium mb-1">아직 이북이 없습니다</div>
          <div className="text-sm text-[var(--color-notion-mute)]">
            위의 &quot;새 이북 추가&quot; 버튼을 눌러 첫 번째 이북을 등록해 보세요.
          </div>
        </div>
      ) : (
        <ul className="border border-[var(--color-notion-rule)] rounded-lg divide-y divide-[var(--color-notion-rule)]">
          {ebooks.map((eb) => (
            <li key={eb.id}>
              {editingId === eb.id ? (
                <div className="p-5 bg-[var(--color-notion-hover)]">
                  <h3 className="text-sm font-semibold mb-4">수정: {eb.title}</h3>
                  <EbookForm ebook={eb} onDone={() => setEditingId(null)} />
                </div>
              ) : (
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-notion-hover)] transition">
                  {/* 표지 썸네일 */}
                  <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-[var(--color-notion-rule)] flex items-center justify-center text-xl">
                    {eb.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={eb.cover_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span aria-hidden="true">📖</span>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {eb.visibility === "members-only" && (
                        <span className="text-xs" title="회원 전용">🔒</span>
                      )}
                      <span className="font-medium truncate">{eb.title}</span>
                    </div>
                    {eb.description && (
                      <p className="text-sm text-[var(--color-notion-mute)] truncate">
                        {eb.description}
                      </p>
                    )}
                    <div className="text-xs text-[var(--color-notion-mute)] mt-1 font-mono">
                      pos={eb.position} · {eb.created_at.slice(0, 10)}
                    </div>
                  </div>

                  {/* 액션 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/ebooks/${eb.id}`}
                      target="_blank"
                      className="notion-icon-btn text-xs"
                      title="공개 페이지 보기"
                    >
                      보기 ↗
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditingId(eb.id)}
                      className="notion-icon-btn text-xs"
                    >
                      편집
                    </button>
                    <form
                      action={deleteEbookAction}
                      onSubmit={(e) => {
                        if (!confirm(`"${eb.title}" 이북을 삭제할까요? 되돌릴 수 없습니다.`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="id" value={eb.id} />
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
