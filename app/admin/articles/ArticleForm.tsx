"use client";

import { useActionState, useRef, useState } from "react";
import { saveArticleAction, type ArticleFormState } from "./actions";
import { chapters } from "@/lib/chapters";
import type { Article } from "@/lib/articles-db";
import { ArticleEditor } from "./ArticleEditor";

export function ArticleForm({
  article,
  initialTags = [],
}: {
  article?: Article;
  initialTags?: string[];
}) {
  const [state, formAction, pending] = useActionState<ArticleFormState, FormData>(
    saveArticleAction,
    {}
  );
  const [bodyHTML, setBodyHTML] = useState(article?.body ?? "");
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const tagRef = useRef<HTMLInputElement>(null);

  // 쉼표로 분리된 문자열을 받아 여러 태그를 한번에 추가
  function addTags(raw: string) {
    const newTags = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (newTags.length === 0) return;
    setTags((prev) => {
      const merged = [...prev];
      for (const t of newTags) {
        if (!merged.includes(t)) merged.push(t);
      }
      return merged;
    });
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTags(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  // onChange: 직접 타이핑 중 쉼표가 들어오면 즉시 분리 (IME 외 경우)
  function onTagChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.includes(",")) {
      addTags(val);
      setTagInput("");
    } else {
      setTagInput(val);
    }
  }

  // onPaste: 붙여넣기 전용 — 쉼표가 있으면 무조건 분리 등록
  function onTagPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text.includes(",")) return; // 쉼표 없으면 기본 동작 유지
    e.preventDefault();
    // 기존 입력 중인 텍스트가 있으면 함께 처리
    const combined = tagInput ? `${tagInput},${text}` : text;
    addTags(combined);
    setTagInput("");
  }

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

      {/* ─ 키워드 태그 ─ */}
      <div>
        <Label>키워드 태그</Label>
        <input type="hidden" name="tags" value={tags.join(",")} />
        <div
          className="notion-input flex flex-wrap gap-1.5 p-2 border border-[var(--color-notion-rule)] focus-within:border-[var(--color-notion-accent)] cursor-text min-h-[40px]"
          onClick={() => tagRef.current?.focus()}
        >
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--color-notion-bg-soft)] border border-[var(--color-notion-rule)] text-[var(--color-notion-ink)]"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="opacity-50 hover:opacity-100 leading-none"
                aria-label={`태그 "${t}" 제거`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={tagRef}
            type="text"
            value={tagInput}
            onChange={onTagChange}
            onKeyDown={onTagKeyDown}
            onPaste={onTagPaste}
            onBlur={() => {
              if (tagInput.trim()) {
                addTags(tagInput);
                setTagInput("");
              }
            }}
            placeholder={tags.length === 0 ? "태그 입력 (Enter·쉼표로 구분, 여러 개 붙여넣기 가능)" : ""}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-[var(--color-notion-mute)]"
          />
        </div>
        <div className="text-xs text-[var(--color-notion-mute)] mt-1">
          Enter 또는 쉼표(,)로 추가. 검색 및 필터링에 활용됩니다.
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
