"use client";

import { useActionState, useState } from "react";
import { saveSlideAction, type SlideFormState } from "./actions";
import type { Slide } from "@/lib/slides-db";

export function SlideForm({ slide }: { slide?: Slide }) {
  const [state, formAction, pending] = useActionState<SlideFormState, FormData>(
    saveSlideAction,
    {}
  );
  const [preview, setPreview] = useState<string | null>(slide?.image_path ?? null);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {slide && <input type="hidden" name="id" value={slide.id} />}
      <input type="hidden" name="current_image" value={slide?.image_path ?? ""} />

      {/* 이미지 */}
      <div>
        <Label>표지 이미지</Label>
        <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
          <div className="aspect-video bg-[var(--color-notion-hover)] rounded-md overflow-hidden border border-[var(--color-notion-rule)]">
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-[var(--color-notion-mute)] text-xs">
                미리보기
              </div>
            )}
          </div>
          <div>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-text)] file:text-white file:cursor-pointer"
            />
            <div className="text-xs text-[var(--color-notion-mute)] mt-2 leading-relaxed">
              jpg / png / webp / gif · 최대 12MB · 권장 가로 2400px 이상, 16:9
              비율. {slide && "교체하지 않으려면 비워 두세요."}
            </div>
          </div>
        </div>
      </div>

      <Field
        name="kicker"
        label="라벨 (작은 윗 글자)"
        defaultValue={slide?.kicker ?? ""}
        placeholder="예: 卷頭言 · 권두언"
      />

      <div>
        <Label>제목</Label>
        <textarea
          name="title"
          rows={2}
          required
          defaultValue={slide?.title ?? ""}
          placeholder="줄바꿈으로 두 줄까지 만들 수 있습니다"
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)] text-lg leading-snug"
        />
      </div>

      <div>
        <Label>설명 (한두 줄)</Label>
        <textarea
          name="excerpt"
          rows={3}
          defaultValue={slide?.excerpt ?? ""}
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          name="cta"
          label="버튼 글자"
          defaultValue={slide?.cta ?? ""}
          placeholder="예: 회의록 보기"
        />
        <Field
          name="href"
          label="버튼 링크"
          defaultValue={slide?.href ?? "/"}
          placeholder="/archive/..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="active"
          type="checkbox"
          defaultChecked={slide ? slide.active === 1 : true}
          className="h-4 w-4"
        />
        <span>활성 — 공개 사이트 메인에 노출</span>
      </label>

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
        <a href="/admin/slides" className="notion-icon-btn h-9">
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

function Field({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
      />
    </div>
  );
}
