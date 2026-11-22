"use client";

import { useEffect, useState } from "react";
import { setArticlesHiddenBulkAction } from "./actions";

const FORM_ID = "bulk-articles";

function boxes(chapter?: string): HTMLInputElement[] {
  const sel = `input[type=checkbox][form="${FORM_ID}"][name="ids"]${chapter ? `[data-chapter="${chapter}"]` : ""}`;
  return Array.from(document.querySelectorAll<HTMLInputElement>(sel));
}

/** 글 한 줄의 체크 칸 — 목록 아래 막대의 폼(FORM_ID)에 속한다. */
export function SelectBox({ id, chapter, title }: { id: number; chapter: string; title: string }) {
  return (
    <input
      type="checkbox"
      name="ids"
      value={id}
      form={FORM_ID}
      data-chapter={chapter}
      aria-label={`"${title}" 선택`}
      className="w-4 h-4 shrink-0 cursor-pointer accent-[var(--color-notion-accent)]"
    />
  );
}

/** 장 제목 옆 — 이 장의 글을 모두 선택/해제. */
export function ChapterSelectAll({ chapter }: { chapter: string }) {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const sync = () => {
      const list = boxes(chapter);
      setChecked(list.length > 0 && list.every((b) => b.checked));
    };
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, [chapter]);
  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer normal-case tracking-normal">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          for (const b of boxes(chapter)) b.checked = e.target.checked;
          document.dispatchEvent(new Event("change"));
        }}
        className="w-3.5 h-3.5 accent-[var(--color-notion-accent)]"
      />
      전체 선택
    </label>
  );
}

/** 하나라도 선택하면 화면 아래에 뜨는 막대 — 선택한 글을 한꺼번에 비공개/다시 공개. */
export function BulkActionBar() {
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const sync = () => setCount(boxes().filter((b) => b.checked).length);
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, []);

  function clearAll() {
    for (const b of boxes()) b.checked = false;
    document.dispatchEvent(new Event("change"));
  }

  return (
    <form
      id={FORM_ID}
      action={async (fd) => {
        setPending(true);
        try {
          await setArticlesHiddenBulkAction(fd);
          clearAll();
        } finally {
          setPending(false);
        }
      }}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const hide = submitter?.value === "1";
        const msg = hide
          ? `선택한 ${count}편을 비공개로 돌릴까요?\n사이트 목록·검색·태그·주소 모두에서 사라지고, 집무실에서만 보입니다. 언제든 다시 공개할 수 있습니다.`
          : `선택한 ${count}편을 다시 공개할까요? (원래 공개 범위로 돌아갑니다)`;
        if (!confirm(msg)) e.preventDefault();
      }}
      className={count > 0 ? "" : "hidden"}
    >
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-notion-rule)] bg-[var(--color-notion-surface,#fff)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="max-w-[1080px] mx-auto px-12 py-3 flex items-center gap-3">
          <span className="text-sm font-medium">{count}편 선택됨</span>
          <button type="button" onClick={clearAll} className="notion-icon-btn text-xs">
            선택 해제
          </button>
          <div className="flex-1" />
          <button
            type="submit"
            name="hide"
            value="0"
            disabled={pending}
            className="notion-icon-btn text-xs border border-[var(--color-notion-rule)] disabled:opacity-50"
          >
            다시 공개
          </button>
          <button
            type="submit"
            name="hide"
            value="1"
            disabled={pending}
            className="notion-icon-btn text-xs bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 px-3"
          >
            {pending ? "처리 중…" : "🚫 선택한 글 비공개"}
          </button>
        </div>
      </div>
    </form>
  );
}
