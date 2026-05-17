"use client";

import { useState, useTransition } from "react";
import { forceReseedChapterAction } from "./actions";

export function ReseedChapterButton({ chapter }: { chapter: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setResult(null);
    const fd = new FormData();
    fd.set("chapter", chapter);
    startTransition(async () => {
      const r = await forceReseedChapterAction(fd);
      if (r?.error) setResult(`✗ ${r.error}`);
      else setResult(`✓ ${chapter}: ${r?.inserted ?? 0}건 추가, ${r?.skipped ?? 0}건 이미 존재`);
    });
  }

  const chapterLabels: Record<string, string> = {
    yeongi: "연기",
    moim: "모임",
    geul: "글",
    saram: "사람",
    jachui: "자취",
    hyang: "향",
  };
  const label = chapterLabels[chapter] ?? chapter;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-3 py-1.5 rounded-md bg-[var(--admin-accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "처리 중…" : `${label} 재시드`}
      </button>
      {result && (
        <span
          className={`text-xs ${
            result.startsWith("✓") ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {result}
        </span>
      )}
    </div>
  );
}
