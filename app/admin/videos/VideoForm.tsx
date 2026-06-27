"use client";

import { useActionState, useState } from "react";
import { saveVideoAction, type VideoFormState } from "./actions";
import type { Video } from "@/lib/videos-db";

export function VideoForm({ video }: { video?: Video }) {
  const [state, formAction, pending] = useActionState<VideoFormState, FormData>(
    saveVideoAction,
    {}
  );

  const [thumbUrl, setThumbUrl] = useState(video?.thumbnail_url ?? "");
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbErr, setThumbErr] = useState<string | null>(null);

  async function uploadThumb(file: File) {
    if (!file.type.startsWith("image/")) {
      setThumbErr("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setThumbUploading(true);
    setThumbErr(null);
    try {
      const { uploadToR2 } = await import("@/lib/r2-client");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await uploadToR2(safeName, file, {
        handleUploadUrl: "/api/upload/photo",
        contentType: file.type || "image/jpeg",
      });
      setThumbUrl(blob.url);
    } catch {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/photo", { method: "POST", body: fd });
        const json = await res.json();
        if (!json.ok) setThumbErr(json.error ?? "썸네일 업로드 실패");
        else setThumbUrl(json.url);
      } catch {
        setThumbErr("썸네일 업로드 중 오류가 발생했습니다.");
      }
    } finally {
      setThumbUploading(false);
    }
  }

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

      {/* 썸네일 — 직접 업로드(선택), 비우면 유튜브 자동 */}
      <div>
        <Label>썸네일</Label>
        <input type="hidden" name="thumbnailUrl" value={thumbUrl} />
        {thumbUrl && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl}
              alt="썸네일 미리보기"
              className="w-40 aspect-video object-cover rounded border border-[var(--color-notion-rule)]"
            />
            <button
              type="button"
              onClick={() => setThumbUrl("")}
              className="text-sm text-[#c4554d] hover:underline"
            >
              삭제
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={thumbUploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadThumb(f);
            e.target.value = "";
          }}
          className="notion-input w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-hover)] file:px-3 file:py-1 file:text-sm file:cursor-pointer"
        />
        {thumbUploading && (
          <div className="text-xs text-[var(--color-notion-mute)] mt-1">업로드 중…</div>
        )}
        {thumbErr && <div className="text-xs text-[#c4554d] mt-1">{thumbErr}</div>}
        <div className="text-xs text-[var(--color-notion-mute)] mt-1">
          비워두면 유튜브 영상의 기본 썸네일을 자동으로 사용합니다.
        </div>
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
