"use client";

import { useRef, useState, useTransition } from "react";
import { createEbookAction, updateEbookAction } from "./actions";
import type { Ebook } from "@/lib/ebooks-db";

interface EbookFormProps {
  ebook?: Ebook;
  onDone?: () => void;
}

export function EbookForm({ ebook, onDone }: EbookFormProps) {
  const isEdit = Boolean(ebook);
  const [pdfUrl, setPdfUrl] = useState(ebook?.pdf_url ?? "");
  const [coverUrl, setCoverUrl] = useState(ebook?.cover_url ?? "");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [pdfProgress, setPdfProgress] = useState(0); // 0~100

  async function uploadPdf(file: File) {
    setPdfUploading(true);
    setPdfProgress(0);
    setError(null);
    try {
      // 1) Vercel Blob 클라이언트 직접 업로드 시도 (서버 4.5MB 제한 우회, 최대 300MB)
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(
        `ebooks/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
        file,
        {
          access: "public",
          handleUploadUrl: "/api/upload/ebook",
          onUploadProgress: ({ percentage }) => setPdfProgress(Math.round(percentage)),
        }
      );
      setPdfUrl(blob.url);
    } catch {
      // 2) 로컬 개발 환경 폴백: 서버를 통한 multipart 업로드
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/ebook", { method: "POST", body: fd });
        const json = await res.json();
        if (!json.ok) {
          setError(json.error ?? "PDF 업로드에 실패했습니다.");
        } else {
          setPdfUrl(json.url);
        }
      } catch {
        setError("PDF 업로드 중 오류가 발생했습니다.");
      }
    } finally {
      setPdfUploading(false);
      setPdfProgress(0);
    }
  }

  async function uploadCover(file: File) {
    setCoverUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/ebook-cover", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "표지 업로드에 실패했습니다.");
      } else {
        setCoverUrl(json.url);
      }
    } catch {
      setError("표지 업로드 중 오류가 발생했습니다.");
    } finally {
      setCoverUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("pdf_url", pdfUrl);
    fd.set("cover_url", coverUrl);
    if (ebook) fd.set("id", String(ebook.id));

    startTransition(async () => {
      const result = isEdit
        ? await updateEbookAction(fd)
        : await createEbookAction(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setPdfUrl("");
      setCoverUrl("");
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
          defaultValue={ebook?.title}
          required
          className="notion-input w-full"
          placeholder="이북 제목"
        />
      </div>

      {/* 설명 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          설명
        </label>
        <textarea
          name="description"
          defaultValue={ebook?.description ?? ""}
          rows={3}
          className="notion-input w-full resize-none"
          placeholder="간단한 설명 (선택)"
        />
      </div>

      {/* PDF 업로드 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          PDF 파일 <span className="text-red-500">*</span>
        </label>
        {pdfUrl && (
          <div className="mb-2 flex items-center gap-2 text-sm text-[var(--color-notion-mute)]">
            <span className="truncate max-w-xs">✓ {pdfUrl.split("/").pop()}</span>
            <button
              type="button"
              onClick={() => setPdfUrl("")}
              className="text-red-500 hover:text-red-700 shrink-0"
            >
              삭제
            </button>
          </div>
        )}
        <input
          type="file"
          accept="application/pdf"
          disabled={pdfUploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadPdf(f);
          }}
          className="notion-input w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-accent)] file:text-white file:px-3 file:py-1 file:text-sm file:cursor-pointer"
        />
        {pdfUploading && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-[var(--color-notion-mute)] mb-1">
              <span>업로드 중…</span>
              {pdfProgress > 0 && <span>{pdfProgress}%</span>}
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-notion-hover)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-notion-accent)] transition-all duration-300"
                style={{ width: pdfProgress > 0 ? `${pdfProgress}%` : "30%" }}
              />
            </div>
          </div>
        )}
        <p className="mt-1 text-xs text-[var(--color-notion-mute)]">최대 300MB, PDF 형식만 가능</p>
      </div>

      {/* 표지 이미지 업로드 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          표지 이미지
        </label>
        {coverUrl && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt="표지 미리보기"
              className="h-20 w-14 object-cover rounded border border-[var(--color-notion-rule)]"
            />
            <button
              type="button"
              onClick={() => setCoverUrl("")}
              className="text-sm text-red-500 hover:text-red-700"
            >
              삭제
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={coverUploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadCover(f);
          }}
          className="notion-input w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-hover)] file:text-[var(--color-notion-ink)] file:px-3 file:py-1 file:text-sm file:cursor-pointer"
        />
        {coverUploading && (
          <p className="mt-1 text-xs text-[var(--color-notion-mute)]">업로드 중...</p>
        )}
      </div>

      {/* 공개범위 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          공개 범위
        </label>
        <select
          name="visibility"
          defaultValue={ebook?.visibility ?? "public"}
          className="notion-input w-full"
        >
          <option value="public">전체 공개</option>
          <option value="members-only">회원 전용</option>
        </select>
      </div>

      {/* 순서 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
          순서 (낮을수록 앞에 표시)
        </label>
        <input
          name="position"
          type="number"
          defaultValue={ebook?.position ?? 0}
          className="notion-input w-32"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || pdfUploading || coverUploading || !pdfUrl}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
        >
          {isPending ? "저장 중..." : isEdit ? "수정 저장" : "이북 추가"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="notion-icon-btn px-4 py-2"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
