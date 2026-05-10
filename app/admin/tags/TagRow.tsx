"use client";

import { useActionState, useState } from "react";
import { deleteTagAction, renameTagAction } from "./actions";

export function TagRow({ tag, count }: { tag: string; count: number }) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(tag);
  const [renameState, renameAction, renamePending] = useActionState(
    renameTagAction,
    {}
  );

  if (editing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-notion-bg-soft)]">
        <form action={renameAction} className="flex items-center gap-2 flex-1">
          <input type="hidden" name="oldTag" value={tag} />
          <input
            name="newTag"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="notion-input flex-1 border border-[var(--color-notion-accent)] text-sm px-2 py-1"
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button
            type="submit"
            disabled={renamePending || !newName.trim() || newName === tag}
            className="notion-icon-btn text-xs bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-40 px-3 h-8"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setNewName(tag);
            }}
            className="notion-icon-btn text-xs h-8"
          >
            취소
          </button>
        </form>
        {renameState.error && (
          <span className="text-xs text-red-500">{renameState.error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-notion-bg-soft)] group">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setEditing(true)}
          className="text-sm font-medium hover:text-[var(--color-notion-accent)] transition"
          title="클릭하여 이름 변경"
        >
          {tag}
        </button>
        <span className="text-xs text-[var(--color-notion-mute)] tabular-nums">
          {count}편
        </span>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <a
          href={`/search?tag=${encodeURIComponent(tag)}`}
          target="_blank"
          className="notion-icon-btn text-xs h-7 px-2"
          title="이 태그의 글 보기"
        >
          보기
        </a>
        <form
          action={deleteTagAction}
          onSubmit={(e) => {
            if (
              !confirm(
                `"${tag}" 키워드를 삭제하면 ${count}편의 글에서 모두 제거됩니다. 계속할까요?`
              )
            )
              e.preventDefault();
          }}
        >
          <input type="hidden" name="tag" value={tag} />
          <button
            type="submit"
            className="notion-icon-btn text-xs h-7 px-2 text-red-500 hover:bg-red-50"
          >
            삭제
          </button>
        </form>
      </div>
    </div>
  );
}
