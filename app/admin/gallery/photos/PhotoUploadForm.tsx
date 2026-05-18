"use client";

import { useRef, useState, useTransition, useCallback } from "react";
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
  previewUrl: string;
  status: UploadStatus;
  progress: number; // 0..100, 표시용
  imageUrl?: string;
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB — 서버 한도와 동일

export function PhotoUploadForm({ categories, defaultCategorySlug }: PhotoUploadFormProps) {
  const defaultCat = categories.find((c) => c.slug === defaultCategorySlug);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [autoStart, setAutoStart] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const valid: QueuedFile[] = [];
    const rejected: string[] = [];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      if (!file.type.startsWith("image/")) {
        rejected.push(`${file.name} (이미지 아님)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} (${Math.round(file.size / 1024 / 1024)}MB > 50MB)`);
        continue;
      }
      valid.push({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
        progress: 0,
      });
    }
    if (rejected.length > 0) {
      alert(`다음 파일은 추가되지 않았습니다:\n\n${rejected.join("\n")}`);
    }
    setQueue((q) => [...q, ...valid]);
    return valid.length > 0;
  }, []);

  // 파일 선택 → 자동 업로드 시작
  function onFilesPicked(files: FileList | null) {
    if (addFiles(files) && autoStart) {
      // 큐가 업데이트된 직후 처리 시작 — setTimeout으로 다음 tick에 실행
      setTimeout(() => startProcessing(), 0);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (addFiles(e.dataTransfer.files) && autoStart) {
      setTimeout(() => startProcessing(), 0);
    }
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

  function buildFormData(imageUrl: string, fileName: string, totalCount: number): FormData {
    const fd = new FormData();
    fd.set("image_url", imageUrl);
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
      const titleStr = title ? String(title).trim() : "";
      if (titleStr) {
        fd.set("title", titleStr);
      } else if (totalCount > 1) {
        fd.set("title", fileName.replace(/\.[^.]+$/, ""));
      }
      if (description) fd.set("description", String(description));
    }
    return fd;
  }

  function startProcessing() {
    if (processing) return;
    const pendingItems = queue.filter((q) => q.status === "pending");
    if (pendingItems.length === 0) return;

    setProcessing(true);
    startTransition(async () => {
      // 큐 스냅샷 — 처리 중 큐 변경 방지
      const snapshot = await new Promise<QueuedFile[]>((resolve) => {
        setQueue((current) => {
          resolve(current.filter((q) => q.status === "pending"));
          return current;
        });
      });

      let ok = 0;
      for (const item of snapshot) {
        setQueue((q) =>
          q.map((it) => (it.id === item.id ? { ...it, status: "uploading", progress: 30 } : it))
        );
        const up = await uploadOne(item.file);
        if (!up.ok) {
          setQueue((q) =>
            q.map((it) =>
              it.id === item.id ? { ...it, status: "error", error: up.error, progress: 0 } : it
            )
          );
          continue;
        }

        setQueue((q) =>
          q.map((it) =>
            it.id === item.id ? { ...it, status: "saving", imageUrl: up.url, progress: 70 } : it
          )
        );
        const fd = buildFormData(up.url, item.file.name, snapshot.length);
        const result = await createPhotoAction(fd);
        if (result && "error" in result && result.error) {
          setQueue((q) =>
            q.map((it) =>
              it.id === item.id ? { ...it, status: "error", error: result.error, progress: 0 } : it
            )
          );
          continue;
        }
        setQueue((q) =>
          q.map((it) => (it.id === item.id ? { ...it, status: "done", progress: 100 } : it))
        );
        ok++;
      }
      setProcessing(false);
      setSuccessCount((n) => n + ok);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // 완료된 항목 5초 후 큐에서 제거 (URL.revokeObjectURL 정리)
      setTimeout(() => {
        setQueue((q) => {
          q.filter((it) => it.status === "done").forEach((it) => URL.revokeObjectURL(it.previewUrl));
          return q.filter((it) => it.status !== "done");
        });
      }, 5000);
    });
  }

  function removeItem(id: string) {
    setQueue((q) => {
      const target = q.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return q.filter((it) => it.id !== id);
    });
  }

  function clearAll() {
    queue.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setQueue([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  return (
    <div className="rounded-xl border border-[var(--color-notion-rule)] p-6 bg-[var(--color-notion-hover)] mb-8">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-base font-semibold">사진 업로드</h2>
        <label className="text-xs text-[var(--color-notion-mute)] flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
          />
          선택 즉시 업로드
        </label>
      </div>
      <p className="text-xs text-[var(--color-notion-mute)] mb-4">
        파일을 끌어다 놓거나 영역을 클릭해서 선택. 한 장 최대 50MB, 여러 장 가능.
      </p>

      {successCount > 0 && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successCount}장 업로드 완료. 계속 업로드할 수 있습니다.
        </div>
      )}

      <form ref={formRef} onSubmit={(e) => { e.preventDefault(); startProcessing(); }} className="space-y-4">
        {/* 드래그앤드롭 영역 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
            dragOver
              ? "border-[var(--color-notion-accent)] bg-blue-50"
              : "border-[var(--color-notion-rule)] bg-white hover:border-[var(--color-notion-accent)]"
          } px-6 py-10 text-center`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={processing}
            onChange={(e) => onFilesPicked(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm font-medium text-[var(--color-notion-ink)] mb-1">
            여기에 사진을 끌어다 놓거나 클릭해 선택
          </div>
          <div className="text-xs text-[var(--color-notion-mute)]">
            JPG · PNG · WEBP · GIF / 한 장당 최대 50MB / 한 번에 여러 장 가능
          </div>
        </div>

        {/* 카테고리 — 가장 중요한 한 줄 */}
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

        {/* 대기열 — 썸네일 그리드 */}
        {queue.length > 0 && (
          <div className="rounded-lg border border-[var(--color-notion-rule)] p-3 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">
                대기 {queue.length}장
                {errorCount > 0 && (
                  <span className="ml-2 text-red-600">· 오류 {errorCount}장</span>
                )}
                {processing && (
                  <span className="ml-2 text-blue-600">
                    · 처리 중 ({queue.filter((q) => q.status === "done").length}/{queue.length})
                  </span>
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {queue.map((item) => (
                <ThumbCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  disabled={processing}
                />
              ))}
            </div>
          </div>
        )}

        {/* 고급 옵션 — 접기 */}
        <details
          open={showAdvanced}
          onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
          className="rounded-lg border border-[var(--color-notion-rule)] bg-white"
        >
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-[var(--color-notion-ink)] select-none hover:bg-[var(--color-notion-hover)]">
            고급 옵션 (제목·설명·날짜·공개 범위 등)
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
                공개 범위
              </label>
              <select name="visibility" defaultValue="public" className="notion-input w-full">
                <option value="public">전체 공개</option>
                <option value="members-only">회원 전용</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
                제목
                <span className="ml-2 text-xs text-[var(--color-notion-mute)]">
                  (비우면 다중 업로드 시 파일명 사용)
                </span>
              </label>
              <input
                name="title"
                className="notion-input w-full"
                placeholder="사진 제목 (선택)"
              />
            </div>

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
              <div>
                <label className="block text-sm font-medium text-[var(--color-notion-ink)] mb-1.5">
                  촬영일
                </label>
                <input name="taken_at" type="date" className="notion-input w-full" />
              </div>
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
          </div>
        </details>

        {/* 업로드 버튼 — 자동 업로드 OFF 일 때만 보임 */}
        {!autoStart && (
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={processing || pendingCount === 0}
              className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
            >
              {processing
                ? `${queue.filter((q) => q.status === "done").length}/${queue.length} 처리 중...`
                : pendingCount > 0
                ? `${pendingCount}장 업로드`
                : "대기 사진 없음"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function ThumbCard({
  item,
  onRemove,
  disabled,
}: {
  item: QueuedFile;
  onRemove: () => void;
  disabled: boolean;
}) {
  const statusLabel =
    item.status === "pending" ? "대기" :
    item.status === "uploading" ? "업로드…" :
    item.status === "saving" ? "저장…" :
    item.status === "done" ? "완료" :
    item.status === "error" ? "오류" : "";
  const statusColor =
    item.status === "done" ? "bg-emerald-500" :
    item.status === "error" ? "bg-red-500" :
    item.status === "pending" ? "bg-gray-400" :
    "bg-blue-500";

  return (
    <div className="relative aspect-square rounded-md overflow-hidden border border-[var(--color-notion-rule)] bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.previewUrl}
        alt={item.file.name}
        className="w-full h-full object-cover"
      />
      {/* 상태 오버레이 */}
      <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] text-white font-medium ${statusColor}`}>
        {statusLabel}
      </div>
      {/* 제거 버튼 — pending/error 상태에서만 */}
      {(item.status === "pending" || item.status === "error") && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] hover:bg-red-600 disabled:opacity-50"
          aria-label="제거"
        >
          ×
        </button>
      )}
      {/* 진행 바 */}
      {item.progress > 0 && item.progress < 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}
      {/* 오류 메시지 */}
      {item.error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-[10px] px-1.5 py-0.5 truncate">
          {item.error}
        </div>
      )}
    </div>
  );
}
