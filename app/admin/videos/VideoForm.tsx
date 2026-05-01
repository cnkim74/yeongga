"use client";

import { useActionState } from "react";
import { saveVideoAction, type VideoFormState } from "./actions";
import type { Video } from "@/lib/videos-db";

export function VideoForm({ video }: { video?: Video }) {
  const [state, formAction, pending] = useActionState<VideoFormState, FormData>(
    saveVideoAction,
    {}
  );

  // edit 화면에서 다시 입력 받을 URL — embed_url 그대로 보여주거나 watch URL 복원
  const initialUrl = video
    ? video.video_id && video.provider === "youtube"
      ? `https://www.youtube.com/watch?v=${video.video_id}`
      : video.video_id && video.provider === "vimeo"
      ? `https://vimeo.com/${video.video_id}`
      : video.embed_url
    : "";

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {video && <input type="hidden" name="id" value={video.id} />}

      <div>
        <Label>유튜브 / 비메오 URL *</Label>
        <input
          name="inputUrl"
          type="url"
          required
          defaultValue={initialUrl}
          placeholder="https://www.youtube.com/watch?v=…  또는  https://vimeo.com/…"
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
        <div className="text-xs text-[var(--color-notion-mute)] mt-2">
          저장 시 자동으로 임베드 URL과 썸네일을 추출합니다.
        </div>
      </div>

      <Field
        name="kicker"
        label="라벨"
        defaultValue={video?.kicker ?? ""}
        placeholder="예: 이번 호 영상"
      />

      <div>
        <Label>제목 *</Label>
        <input
          name="title"
          type="text"
          required
          defaultValue={video?.title ?? ""}
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)] text-lg"
        />
      </div>

      <div>
        <Label>설명</Label>
        <textarea
          name="description"
          rows={3}
          defaultValue={video?.description ?? ""}
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="featured"
          type="checkbox"
          defaultChecked={video ? video.featured === 1 : false}
          className="h-4 w-4"
        />
        <span>⭐ 메인 추천 영상으로 지정 (한 번에 한 편만 가능)</span>
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
        <a href="/admin/videos" className="notion-icon-btn h-9">
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
