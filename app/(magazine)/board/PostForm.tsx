"use client";

import { useRef, useState, useTransition } from "react";
import { createPostAction, updatePostAction } from "./actions";
import type { PostDetail } from "@/lib/board-db";

type Attach = { file_url: string; file_name: string; file_size: number; mime: string | null };

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImageName(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i.test(name);
}

export function PostForm({
  post,
  isAdmin,
}: {
  post?: PostDetail;
  isAdmin: boolean;
}) {
  const isEdit = Boolean(post);
  const [attachments, setAttachments] = useState<Attach[]>(
    post?.attachments.map((a) => ({
      file_url: a.file_url,
      file_name: a.file_name,
      file_size: a.file_size,
      mime: a.mime,
    })) ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function uploadOne(file: File) {
    const originalName = file.name;
    try {
      const { uploadToR2 } = await import("@/lib/r2-client");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await uploadToR2(safeName, file, {
        handleUploadUrl: "/api/upload/document",
        contentType: file.type || "application/octet-stream",
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      return { file_url: blob.url, file_name: originalName, file_size: file.size, mime: file.type || null };
    } catch {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/document", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "업로드 실패");
      return { file_url: json.url, file_name: originalName, file_size: file.size, mime: file.type || null };
    }
  }

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        setProgress(0);
        const att = await uploadOne(file);
        setAttachments((prev) => [...prev, att]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((a) => a.file_url !== url));
  }

  function move(index: number, dir: -1 | 1) {
    setAttachments((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("attachments", JSON.stringify(attachments));
    if (post) fd.set("id", String(post.id));

    startTransition(async () => {
      const result = isEdit ? await updatePostAction(fd) : await createPostAction(fd);
      // 성공 시 액션이 redirect → 아래는 에러 때만 도달
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          defaultValue={post?.title}
          required
          maxLength={200}
          className="notion-input w-full"
          placeholder="제목"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          내용
        </label>
        <textarea
          name="body"
          defaultValue={post?.body ?? ""}
          rows={12}
          className="notion-input w-full resize-y leading-relaxed"
          placeholder="내용을 입력하세요"
        />
      </div>

      {/* 첨부파일 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          첨부파일
        </label>
        {attachments.length > 0 && (
          <ul className="mb-3 space-y-2">
            {attachments.map((a, i) => (
              <li
                key={a.file_url}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-rule)] p-2"
              >
                {/* 썸네일/아이콘 */}
                <span className="shrink-0 w-11 h-11 rounded bg-[var(--color-bg-soft)] border border-[var(--color-rule)] overflow-hidden flex items-center justify-center">
                  {isImageName(a.file_name) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.file_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span aria-hidden="true">📎</span>
                  )}
                </span>

                {/* 이름·크기 */}
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm text-[var(--color-ink)]">
                    {a.file_name}
                  </span>
                  {a.file_size > 0 && (
                    <span className="block text-xs text-[var(--color-ink-mute)]">
                      {formatSize(a.file_size)}
                    </span>
                  )}
                </span>

                {/* 순서 이동 */}
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="위로"
                    className="px-1.5 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === attachments.length - 1}
                    aria-label="아래로"
                    className="px-1.5 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeAttachment(a.file_url)}
                  className="shrink-0 text-red-500 hover:text-red-700 text-xs"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          type="file"
          multiple
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-bg-soft)] file:px-3 file:py-1.5 file:text-sm file:cursor-pointer"
        />
        {uploading && (
          <div className="mt-2 text-xs text-[var(--color-ink-mute)]">
            업로드 중… {progress > 0 ? `${progress}%` : ""}
          </div>
        )}
        <p className="mt-1 text-xs text-[var(--color-ink-mute)]">
          여러 개 선택 가능, 모든 형식 (최대 300MB/개). ▲▼로 순서를 바꾸면 그 순서대로 보입니다.
        </p>
      </div>

      {/* 공지 (관리자만) */}
      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
          <input
            type="checkbox"
            name="pinned"
            defaultChecked={post?.pinned}
            className="w-4 h-4"
          />
          📌 공지로 등록 (목록 상단 고정)
        </label>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="btn-pill text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "저장 중…" : isEdit ? "수정 완료" : "등록"}
        </button>
        <a
          href={post ? `/board/${post.id}` : "/board"}
          className="text-sm py-2 px-4 rounded-full border border-[var(--color-rule)] text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition"
        >
          취소
        </a>
      </div>
    </form>
  );
}
