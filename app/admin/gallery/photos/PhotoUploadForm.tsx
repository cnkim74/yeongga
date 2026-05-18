"use client";

import { useRef, useState, useTransition } from "react";
import { createPhotoAction } from "../actions";
import type { PhotoCategory } from "@/lib/gallery-db";

interface PhotoUploadFormProps {
  categories: PhotoCategory[];
  defaultCategorySlug?: string;
}

type UploadStatus = "pending" | "uploading" | "saving" | "done" | "error";

interface QueuedFile {
  id: string;
  file: File;
  status: UploadStatus;
  imageUrl?: string;
  error?: string;
}

export function PhotoUploadForm({ categories, defaultCategorySlug }: PhotoUploadFormProps) {
  const defaultCat = categories.find((c) => c.slug === defaultCategorySlug);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newItems: QueuedFile[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      status: "pending",
    }));
    setQueue((q) => [...q, ...newItems]);
  }

  async function uploadOne(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) return { ok: false, error: json.error ?? "업로드 실패" };
      return { ok: true, url: json.url };
    } catch {
      return { ok: false, error: "네트워크 오류" };
    }
  }

  function buildFormData(imageUrl: string, fileName: string): FormData {
    const fd = new FormData();
    fd.set("image_url", imageUrl);
    // 폼의 공통 메타데이터 (카테고리·공개범위·촬영일·순서) 적용
    if (formRef.current) {
      const form = new FormData(formRef.current);
      const categoryId = form.get("category_id");
      const visibility = form.get("visibility");
      const taken_at = form.get("taken_at");
      const position = form.get("position");
      const title = form.get("title");
      const description = form.get("description");
      if (categoryId) fd.set("category_id", String(categoryId));
      if (visibility) fd.set("visibility", String(visibility));
      if (taken_at) fd.set("taken_at", String(taken_at));
      if (position) fd.set("position", String(position));
      // 다중 업로드 시 제목이 비어있으면 파일명에서 추출 (확장자 제거)
      const titleStr = title ? String(title).trim() : "";
      if (titleStr) {
        fd.set("title", titleStr);
      } else if (queue.length > 1) {
        // 다중 업로드일 때만 파일명으로 자동 채움
        fd.set("title", fileName.replace(/\.[^.]+$/, ""));
      }
      if (description) fd.set("description", String(description));
    }
    return fd;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (queue.length === 0) return;
    if (processing) return;

    setProcessing(true);
    startTransition(async () => {
      let ok = 0;
      for (const item of queue) {
        if (item.status === "done") continue;

        // 1) 이미지 업로드
        setQueue((q) => q.map((it) => (it.id === item.id ? { ...it, status: "uploading" } : it)));
        const up = await uploadOne(item.file);
        if (!up.ok) {
          setQueue((q) =>
            q.map((it) => (it.id === item.id ? { ...it, status: "error", error: up.error } : it))
          );
          continue;
        }

        // 2) DB 저장
        setQueue((q) =>
          q.map((it) => (it.id === item.id ? { ...it, status: "saving", imageUrl: up.url } : it))
        );
        const fd = buildFormData(up.url, item.file.name);
        const result = await createPhotoAction(fd);
        if (result && "error" in result && result.error) {
          setQueue((q) =>
            q.map((it) =>
              it.id === item.id ? { ...it, status: "error", error: result.error } : it
            )
          );
          continue;
        }
        setQueue((q) => q.map((it) => (it.id === item.id ? { ...it, status: "done" } : it)));
        ok++;
      }
      setProcessing(false);
      setSuccessCount((n) => n + ok);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // 5초 후 완료된 것은 큐에서 제거
      setTimeout(() => {
        setQueue((q) => q.filter((it) => it.status !== "done"));
      }, 5000);
    });
  }

  function removeItem(id: string) {
    setQueue((q) => q.filter((it) => it.id !== id));
  }

  function clearAll() {
    setQueue([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  return (
    <div className="rounded-xl border border-[var(--color-notion-rule)] p-6 bg-[var(--color-notion-hover)] mb-8">
      <h2 className="text-base font-semibold mb-1">사진 업로드</h2>
      <p className="text-xs text-[var(--color-notion-mute)] mb-4">
        한 번에 여러 장을 선택할 수 있습니다. 카테고리·공개 범위 등은 선택한 모든 사진에 공통으로 적용됩니다.
      </p>

      {successCount > 0 && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successCount}장 업로드 완료. 계속 업로드할 수 있습니다.
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* 이미지 파일 선택 — 다중 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
            이미지 파일 <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-[var(--color-notion-mute)]">(여러 장 선택 가능)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={processing}
            onChange={(e) => onFilesPicked(e.target.files)}
            className="notion-input w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-accent)] file:text-white file:px-3 file:py-1 file:text-sm file:cursor-pointer"
          />
        </div>

        {/* 대기열 미리보기 */}
        {queue.length > 0 && (
          <div className="rounded-lg border border-[var(--color-notion-rule)] p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                대기 {queue.length}장
                {errorCount > 0 && (
                  <span className="ml-2 text-red-600">오류 {errorCount}장</span>
                )}
              </div>
              <button
                type="button"
                onClick={clearAll}
                disabled={processing}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                모두 비우기
              </button>
            </div>
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1.5 text-xs items-center">
              {queue.map((item) => (
                <FragmentRow
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  disabled={processing}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
              카테고리
            </label>
            <select
              name="category_id"
              defaultValue={defaultCat?.id ?? ""}
              className="notion-input w-full"
            >
              <option value="">미분류</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 공개범위 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
              공개 범위
            </label>
            <select name="visibility" defaultValue="public" className="notion-input w-full">
              <option value="public">전체 공개</option>
              <option value="members-only">회원 전용</option>
            </select>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
            제목
            <span className="ml-2 text-xs text-[var(--color-notion-mute)]">
              (다중 업로드 시 비워두면 파일명을 사용)
            </span>
          </label>
          <input
            name="title"
            className="notion-input w-full"
            placeholder="사진 제목 (선택)"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
            설명
          </label>
          <textarea
            name="description"
            rows={2}
            className="notion-input w-full resize-none"
            placeholder="사진 설명 (선택)"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* 촬영일 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
              촬영일
            </label>
            <input
              name="taken_at"
              type="date"
              className="notion-input w-full"
            />
          </div>

          {/* 순서 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
              순서 시작값
            </label>
            <input
              name="position"
              type="number"
              defaultValue={0}
              className="notion-input w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isPending || processing || pendingCount === 0}
            className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
          >
            {processing
              ? `${queue.filter((q) => q.status === "done").length}/${queue.length} 처리 중...`
              : pendingCount > 0
              ? `${pendingCount}장 업로드`
              : "사진 추가"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FragmentRow({
  item,
  onRemove,
  disabled,
}: {
  item: QueuedFile;
  onRemove: () => void;
  disabled: boolean;
}) {
  const label =
    item.status === "pending" ? "대기" :
    item.status === "uploading" ? "업로드 중…" :
    item.status === "saving" ? "저장 중…" :
    item.status === "done" ? "완료" :
    item.status === "error" ? "오류" : "";
  const color =
    item.status === "done" ? "text-emerald-600" :
    item.status === "error" ? "text-red-600" :
    item.status === "pending" ? "text-[var(--color-notion-mute)]" :
    "text-blue-600";

  return (
    <>
      <div className="font-mono text-[10px] text-[var(--color-notion-mute)] truncate max-w-[20em]">
        {item.file.name}
      </div>
      <div className="text-[10px] text-[var(--color-notion-mute)]">
        {Math.round(item.file.size / 1024)} KB
      </div>
      <div className={`text-[10px] ${color}`}>
        {label}
        {item.error && <span className="ml-1">— {item.error}</span>}
      </div>
      <div>
        {(item.status === "pending" || item.status === "error") && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="text-[10px] text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            제거
          </button>
        )}
      </div>
    </>
  );
}
