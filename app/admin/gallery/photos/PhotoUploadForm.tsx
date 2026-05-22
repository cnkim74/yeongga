"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import exifr from "exifr";
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
  progress: number; // 0..100, 실제 업로드 진행률 (XHR upload.onprogress 기반)
  imageUrl?: string;
  error?: string;
  /** EXIF DateTimeOriginal — YYYY-MM-DD 형식. 비동기 추출이라 늦게 채워질 수 있음. */
  takenAt?: string;
  /** EXIF 추출 시도 완료 여부 (실패도 true) — 추출 중 상태 표시용. */
  exifReady: boolean;
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
        exifReady: false,
      });
    }
    if (rejected.length > 0) {
      alert(`다음 파일은 추가되지 않았습니다:\n\n${rejected.join("\n")}`);
    }
    setQueue((q) => [...q, ...valid]);

    // 큐에 들어간 후 EXIF DateTimeOriginal 비동기 추출 — 추출이 끝날 때마다
    // 해당 큐 항목을 업데이트. 추출 자체가 늦어도 업로드는 막지 않음
    // (uploadOne 직전에 한 번 더 await 으로 보장).
    for (const item of valid) {
      extractTakenAt(item.file)
        .then((takenAt) => {
          setQueue((q) =>
            q.map((it) =>
              it.id === item.id ? { ...it, takenAt, exifReady: true } : it
            )
          );
        })
        .catch(() => {
          setQueue((q) =>
            q.map((it) => (it.id === item.id ? { ...it, exifReady: true } : it))
          );
        });
    }
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

  function uploadOne(
    file: File,
    onProgress: (pct: number) => void
  ): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    return new Promise((resolve) => {
      const fd = new FormData();
      // 한글·공백 파일명은 multipart 전송 단계에서 거부되는 환경이 있어 ASCII 안전 이름으로 재작성
      fd.append("file", makeSafeFile(file));

      // XMLHttpRequest 를 쓰는 이유: fetch 는 업로드 진행률(upload.onprogress)을
      // 제공하지 않음. 진짜 바이트 단위 진행률이 필요하면 XHR 만이 답.
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload/photo");
      xhr.responseType = "json";

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // 업로드 전송 단계는 전체 진행률의 0~85% 로 매핑.
          // 나머지 85~100% 는 server action (createPhotoAction) 구간.
          const pct = Math.round((e.loaded / e.total) * 85);
          onProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const json = xhr.response as { ok?: boolean; url?: string; error?: string } | null;
          if (json && json.ok && json.url) {
            onProgress(85);
            resolve({ ok: true, url: json.url });
          } else {
            resolve({ ok: false, error: json?.error ?? "업로드 실패" });
          }
        } else {
          resolve({ ok: false, error: `서버 오류 (${xhr.status})` });
        }
      };

      xhr.onerror = () => resolve({ ok: false, error: "네트워크 오류" });
      xhr.onabort = () => resolve({ ok: false, error: "업로드 취소됨" });

      xhr.send(fd);
    });
  }

  function makeSafeFile(file: File): File {
    if (/^[\w.-]+$/.test(file.name)) return file;
    const m = file.name.match(/\.([^.]+)$/);
    const ext = m ? m[1].toLowerCase() : "bin";
    const safeName = `upload-${Date.now()}.${ext}`;
    return new File([file], safeName, { type: file.type, lastModified: file.lastModified });
  }

  function buildFormData(
    imageUrl: string,
    fileName: string,
    totalCount: number,
    perFileTakenAt?: string
  ): FormData {
    const fd = new FormData();
    fd.set("image_url", imageUrl);
    if (formRef.current) {
      const form = new FormData(formRef.current);
      const categoryId = form.get("category_id");
      const visibility = form.get("visibility");
      const globalTakenAt = form.get("taken_at");
      const position = form.get("position");
      const title = form.get("title");
      const description = form.get("description");
      if (categoryId) fd.set("category_id", String(categoryId));
      if (visibility) fd.set("visibility", String(visibility));
      // 촬영일 우선순위: 폼에 명시적으로 입력된 값 > EXIF 자동 추출값
      const globalTakenAtStr = globalTakenAt ? String(globalTakenAt).trim() : "";
      const effectiveTakenAt = globalTakenAtStr || perFileTakenAt || "";
      if (effectiveTakenAt) fd.set("taken_at", effectiveTakenAt);
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

  // 한 장당 업로드 + 저장. 병렬 처리용으로 추출.
  async function processItem(item: QueuedFile, totalCount: number): Promise<boolean> {
    setQueue((q) =>
      q.map((it) => (it.id === item.id ? { ...it, status: "uploading", progress: 0 } : it))
    );

    const up = await uploadOne(item.file, (pct) => {
      setQueue((q) =>
        q.map((it) => (it.id === item.id ? { ...it, progress: pct } : it))
      );
    });

    if (!up.ok) {
      setQueue((q) =>
        q.map((it) =>
          it.id === item.id ? { ...it, status: "error", error: up.error, progress: 0 } : it
        )
      );
      return false;
    }

    setQueue((q) =>
      q.map((it) =>
        it.id === item.id ? { ...it, status: "saving", imageUrl: up.url, progress: 90 } : it
      )
    );

    // EXIF 추출이 아직 안 끝났으면 잠깐 기다림 (최대 2초). 대부분 즉시 완료.
    let takenAt = item.takenAt;
    if (!item.exifReady) {
      const fresh = await waitForExifReady(setQueue, item.id, 2000);
      takenAt = fresh ?? item.takenAt;
    }

    const fd = buildFormData(up.url, item.file.name, totalCount, takenAt);
    const result = await createPhotoAction(fd);
    if (result && "error" in result && result.error) {
      setQueue((q) =>
        q.map((it) =>
          it.id === item.id ? { ...it, status: "error", error: result.error, progress: 0 } : it
        )
      );
      return false;
    }
    setQueue((q) =>
      q.map((it) => (it.id === item.id ? { ...it, status: "done", progress: 100 } : it))
    );
    return true;
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

      // 병렬 처리 — 동시 4장씩. 서버·R2 부하 분산용.
      // 워커 4개가 큐에서 다음 항목을 가져다 처리, 비어지면 종료.
      const concurrency = Math.min(4, snapshot.length);
      let idx = 0;
      let ok = 0;
      async function worker() {
        while (true) {
          const myIdx = idx++;
          if (myIdx >= snapshot.length) return;
          const item = snapshot[myIdx];
          const success = await processItem(item, snapshot.length);
          if (success) ok++;
        }
      }
      await Promise.all(Array.from({ length: concurrency }, () => worker()));

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
        파일을 끌어다 놓거나 영역을 클릭해서 선택. 한 장 최대 50MB. 여러 장 한 번에 가능 — 동시 4장씩 병렬 업로드.
        촬영일은 사진의 EXIF 정보에서 자동 추출됩니다 (아래 〈고급 옵션〉에서 명시한 값이 우선).
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
                  <span className="ml-2 text-xs text-[var(--color-notion-mute)]">
                    (비우면 사진별 EXIF 값 자동 적용)
                  </span>
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

/**
 * 이미지 파일에서 EXIF DateTimeOriginal 을 뽑아 YYYY-MM-DD 로 반환.
 * 추출 실패(EXIF 없음, 파싱 오류 등)는 undefined.
 *
 * exifr.parse(file, ['DateTimeOriginal']) 만 호출하므로 트리쉐이킹으로
 * 번들 영향 최소.
 */
async function extractTakenAt(file: File): Promise<string | undefined> {
  try {
    const exif = (await exifr.parse(file, ["DateTimeOriginal"])) as
      | { DateTimeOriginal?: Date }
      | undefined;
    const d = exif?.DateTimeOriginal;
    if (!(d instanceof Date) || isNaN(d.getTime())) return undefined;
    // YYYY-MM-DD (input[type=date] 호환)
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return undefined;
  }
}

/**
 * 큐 항목의 EXIF 추출이 끝날 때까지 (또는 timeoutMs 까지) 기다림.
 * setState callback 으로 최신 큐를 폴링해서 exifReady 가 true 가 되면 반환.
 */
function waitForExifReady(
  setQueue: React.Dispatch<React.SetStateAction<QueuedFile[]>>,
  id: string,
  timeoutMs: number
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      let resolved = false;
      setQueue((current) => {
        const item = current.find((it) => it.id === id);
        if (!item) {
          clearInterval(interval);
          resolve(undefined);
          resolved = true;
        } else if (item.exifReady) {
          clearInterval(interval);
          resolve(item.takenAt);
          resolved = true;
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve(undefined);
          resolved = true;
        }
        return current;
      });
      if (resolved) clearInterval(interval);
    }, 80);
  });
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
      {/* 업로드 중 진행률 숫자 — 모서리에 작게 */}
      {item.status === "uploading" && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono tabular-nums">
          {item.progress}%
        </div>
      )}
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
      {/* EXIF 촬영일 — 추출 완료 시 좌하단에 작게 (대기 상태에만) */}
      {item.status === "pending" && item.exifReady && item.takenAt && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[10px] px-1.5 py-0.5 truncate font-mono tabular-nums">
          📅 {item.takenAt}
        </div>
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
