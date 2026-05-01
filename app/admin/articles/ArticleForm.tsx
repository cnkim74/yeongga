"use client";

import { useActionState, useState } from "react";
import { saveArticleAction, type ArticleFormState } from "./actions";
import { chapters } from "@/lib/chapters";
import type { Article } from "@/lib/articles-db";
import { ArticleEditor } from "./ArticleEditor";

export function ArticleForm({ article }: { article?: Article }) {
  const [state, formAction, pending] = useActionState<ArticleFormState, FormData>(
    saveArticleAction,
    {}
  );
  const [bodyHTML, setBodyHTML] = useState(article?.body ?? "");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {article && <input type="hidden" name="id" value={article.id} />}

      <div className="grid sm:grid-cols-[200px_1fr] gap-4">
        <div>
          <Label>장(章)</Label>
          <select
            name="chapter"
            required
            defaultValue={article?.chapter ?? chapters[0].slug}
            className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
          >
            {chapters.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.number}. {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>슬러그 (URL)</Label>
          <input
            name="slug"
            type="text"
            required
            defaultValue={article?.slug ?? ""}
            placeholder="cheot-moim"
            pattern="[a-z0-9][a-z0-9-]*"
            className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)] font-mono text-sm"
          />
          <div className="text-xs text-[var(--color-notion-mute)] mt-1">
            영문 소문자·숫자·하이픈만. 한 장(章) 안에서 유일해야 합니다.
          </div>
        </div>
      </div>

      <div>
        <Label>제목</Label>
        <input
          name="title"
          type="text"
          required
          defaultValue={article?.title ?? ""}
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)] text-lg"
        />
      </div>

      <div>
        <Label>부제 (선택)</Label>
        <input
          name="subtitle"
          type="text"
          defaultValue={article?.subtitle ?? ""}
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>날짜</Label>
          <input
            name="date"
            type="date"
            required
            defaultValue={article?.date ?? today}
            className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)] font-mono"
          />
        </div>
        <div>
          <Label>글쓴이 (선택)</Label>
          <input
            name="author"
            type="text"
            defaultValue={article?.author ?? ""}
            className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
          />
        </div>
      </div>

      <div>
        <Label>발췌 (목록·미리보기에 노출)</Label>
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={article?.excerpt ?? ""}
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
      </div>

      <div>
        <Label>표지 이미지 경로 (선택)</Label>
        <input
          name="cover"
          type="text"
          defaultValue={article?.cover ?? ""}
          placeholder="/covers/foo.jpg"
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)] font-mono text-sm"
        />
      </div>

      <div>
        <Label>공개 범위</Label>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="public"
              defaultChecked={(article?.visibility ?? "public") === "public"}
            />
            공개 — 누구나 열람
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="members-only"
              defaultChecked={article?.visibility === "members-only"}
            />
            🔒 회원 전용
          </label>
        </div>
      </div>

      <div>
        <Label>본문</Label>
        <input type="hidden" name="body" value={bodyHTML} />
        <ArticleEditor initialHTML={bodyHTML} onChange={setBodyHTML} />
        <div className="text-xs text-[var(--color-notion-mute)] mt-2 leading-relaxed">
          이미지: 끌어다 놓거나 붙여넣기(Cmd/Ctrl+V) — 자동 업로드. 선택하면
          정렬·크기·캡션 변경 가능. YouTube: ▶ 버튼에 URL 붙여넣기.
        </div>
      </div>

      {state.error && (
        <div className="text-sm text-[#c4554d] bg-[#ffe2dd] border border-[#f5c8c0] rounded-lg p-3">
          {state.error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 px-4 h-9"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <a href="/admin/articles" className="notion-icon-btn h-9">
          취소
        </a>
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-[var(--color-notion-mute)] font-medium mb-2 uppercase tracking-wider">
      {children}
    </div>
  );
}
