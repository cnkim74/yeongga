"use client";

import { useState, useTransition } from "react";
import { restoreArticleBodyAction } from "./actions";

export function RestoreBodyForm({
  defaultChapter = "saram",
  defaultSlug = "",
}: {
  defaultChapter?: string;
  defaultSlug?: string;
}) {
  const [chapter, setChapter] = useState(defaultChapter);
  const [slug, setSlug] = useState(defaultSlug);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const fd = new FormData();
    fd.set("chapter", chapter);
    fd.set("slug", slug);

    startTransition(async () => {
      const r = await restoreArticleBodyAction(fd);
      if (r?.error) setResult(`✗ ${r.error}`);
      else setResult(`✓ ${chapter}/${slug} 본문이 원본 파일에서 복원되었습니다`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div className="text-xs text-[var(--admin-ink-soft)] mb-2 leading-relaxed">
        선택한 글의 <b>본문(body)만</b> 원본 마크다운 파일(<code className="font-mono text-[11px]">content/articles/&lt;챕터&gt;/&lt;슬러그&gt;.md</code>)에서 다시 가져와 DB 에 덮어씁니다.
        <br />
        표지 이미지·제목·태그 등 다른 메타데이터는 그대로 유지됩니다.
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] text-[var(--admin-mute)] mb-1">챕터</label>
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="notion-input text-sm h-9 px-3"
          >
            <option value="yeongi">yeongi (연기)</option>
            <option value="moim">moim (모임)</option>
            <option value="geul">geul (글)</option>
            <option value="saram">saram (사람)</option>
            <option value="jachui">jachui (자취)</option>
            <option value="hyang">hyang (향)</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] text-[var(--admin-mute)] mb-1">슬러그</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="예: 2dae-ryu-mokgi"
            className="notion-input text-sm h-9 px-3 w-full font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !slug.trim()}
          className="h-9 px-4 rounded-md bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "복원 중…" : "본문 복원"}
        </button>
      </div>

      {result && (
        <div
          className={`text-xs mt-2 ${
            result.startsWith("✓") ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {result}
        </div>
      )}
    </form>
  );
}
