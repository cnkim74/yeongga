"use client";

import { useRef, useState, useTransition } from "react";
import { createDocumentAction, updateDocumentAction } from "./actions";
import type { Document } from "@/lib/documents-db";

interface DocumentFormProps {
  document?: Document;
  categories?: string[];
  onDone?: () => void;
}

export function DocumentForm({ document, categories = [], onDone }: DocumentFormProps) {
  const isEdit = Boolean(document);
  const [fileUrl, setFileUrl] = useState(document?.file_url ?? "");
  const [fileName, setFileName] = useState(document?.file_name ?? "");
  const [fileSize, setFileSize] = useState(document?.file_size ?? 0);
  const [mime, setMime] = useState(document?.mime ?? "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setProgress(0);
    setError(null);
    const originalName = file.name;
    try {
      // 1) R2 클라이언트 직접 업로드 (서버 4.5MB 제한 우회, 최대 300MB)
      const { uploadToR2 } = await import("@/lib/r2-client");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await uploadToR2(safeName, file, {
        handleUploadUrl: "/api/upload/document",
        contentType: file.type || "application/octet-stream",
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      setFileUrl(blob.url);
      setFileName(originalName);
      setFileSize(file.size);
      setMime(file.type || "");
    } catch {
      // 2) 로컬 개발 폴백: 서버를 통한 multipart 업로드
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/document", { method: "POST", body: fd });
        const json = await res.json();
        if (!json.ok) {
          setError(json.error ?? "파일 업로드에 실패했습니다.");
        } else {
          setFileUrl(json.url);
          setFileName(originalName);
          setFileSize(file.size);
          setMime(file.type || "");
        }
      } catch {
        setError("파일 업로드 중 오류가 발생했습니다.");
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("file_url", fileUrl);
    fd.set("file_name", fileName);
    fd.set("file_size", String(fileSize));
    fd.set("mime", mime);
    if (document) fd.set("id", String(document.id));

    startTransition(async () => {
      const result = isEdit
        ? await updateDocumentAction(fd)
        : await createDocumentAction(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setFileUrl("");
      setFileName("");
      setFileSize(0);
      setMime("");
      onDone?.();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 제목 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          defaultValue={document?.title}
          required
          className="notion-input w-full"
          placeholder="자료 제목"
        />
      </div>

      {/* 카테고리 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          분류
        </label>
        <input
          name="category"
          defaultValue={document?.category ?? ""}
          list="document-categories"
          className="notion-input w-full"
          placeholder="예: 회의록, 서식, 회계 (비워두면 '기타')"
        />
        <datalist id="document-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* 설명 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          설명
        </label>
        <textarea
          name="description"
          defaultValue={document?.description ?? ""}
          rows={2}
          className="notion-input w-full resize-none"
          placeholder="간단한 설명 (선택)"
        />
      </div>

      {/* 파일 업로드 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          파일 <span className="text-red-500">*</span>
        </label>
        {fileUrl && (
          <div className="mb-2 flex items-center gap-2 text-sm text-[var(--color-notion-mute)]">
            <span className="truncate max-w-xs">✓ {fileName || fileUrl.split("/").pop()}</span>
            <button
              type="button"
              onClick={() => {
                setFileUrl("");
                setFileName("");
                setFileSize(0);
                setMime("");
              }}
              className="text-red-500 hover:text-red-700 shrink-0"
            >
              삭제
            </button>
          </div>
        )}
        <input
          type="file"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
          }}
          className="notion-input w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-accent)] file:text-white file:px-3 file:py-1 file:text-sm file:cursor-pointer"
        />
        {uploading && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-[var(--color-notion-mute)] mb-1">
              <span>업로드 중…</span>
              {progress > 0 && <span>{progress}%</span>}
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-notion-hover)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-notion-accent)] transition-all duration-300"
                style={{ width: progress > 0 ? `${progress}%` : "30%" }}
              />
            </div>
          </div>
        )}
        <p className="mt-1 text-xs text-[var(--color-notion-mute)]">
          모든 형식 가능 (한글·워드·엑셀·PDF·이미지·압축파일 등), 최대 300MB
        </p>
      </div>

      {/* 순서 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          순서 (낮을수록 앞에 표시)
        </label>
        <input
          name="position"
          type="number"
          defaultValue={document?.position ?? 0}
          className="notion-input w-32"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading || !fileUrl}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
        >
          {isPending ? "저장 중..." : isEdit ? "수정 저장" : "자료 추가"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="notion-icon-btn px-4 py-2">
            취소
          </button>
        )}
      </div>
    </form>
  );
}
