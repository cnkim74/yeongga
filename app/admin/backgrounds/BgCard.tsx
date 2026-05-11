"use client";
import { useActionState, useRef, useState } from "react";
import { saveBgAction, removeImageAction, type BgFormState } from "./actions";
import type { PageBackground } from "@/lib/backgrounds-db";

const PAGE_LABELS: Record<string, string> = {
  home: "표지 (홈)",
  archive: "아카이브",
  search: "검색",
  videos: "영상",
  about: "소개",
};

export function BgCard({ bg }: { bg: PageBackground }) {
  const [state, formAction, pending] = useActionState<BgFormState, FormData>(saveBgAction, {});
  const [imagePath, setImagePath] = useState(bg.image_path ?? "");
  const [opacity, setOpacity] = useState(Math.round(bg.opacity * 100));
  const [active, setActive] = useState(bg.active);
  const [position, setPosition] = useState(bg.position ?? "center");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      // 1) Vercel Blob 클라이언트 직접 업로드 (4.5MB 한도 우회, 최대 15MB)
      try {
        const { upload } = await import("@vercel/blob/client");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const blob = await upload(`backgrounds/${Date.now()}-${safeName}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload/page-bg",
        });
        setImagePath(blob.url);
        setActive(true);
        return;
      } catch (blobErr) {
        // 2) 로컬 개발 환경 폴백: multipart 업로드
        console.warn("[bg upload] Blob 직접 업로드 실패, multipart 폴백:", blobErr);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/page-bg", { method: "POST", body: fd });
        if (!res.ok) {
          if (res.status === 413) {
            setUploadError(
              `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 12MB 이하로 줄여 주세요.`
            );
          } else {
            setUploadError(`업로드 실패 (HTTP ${res.status}).`);
          }
          return;
        }
        const json = await res.json();
        if (json.ok) {
          setImagePath(json.url);
          setActive(true);
        } else {
          setUploadError(json.error ?? "업로드 실패");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(`업로드 중 오류: ${msg}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="border border-[var(--color-notion-rule)] rounded-xl overflow-hidden">
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--color-notion-bg-soft)] border-b border-[var(--color-notion-rule)]">
        <div>
          <span className="font-semibold">{PAGE_LABELS[bg.page] ?? bg.page}</span>
          <span className="ml-2 text-xs text-[var(--color-notion-mute)] font-mono">
            /{bg.page === "home" ? "" : bg.page}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {active ? "활성" : "비활성"}
        </span>
      </div>

      <form action={formAction} className="p-5 space-y-4">
        <input type="hidden" name="page" value={bg.page} />
        <input type="hidden" name="image_path" value={imagePath} />
        <input type="hidden" name="opacity" value={opacity} />
        <input type="hidden" name="active" value={active ? "1" : "0"} />
        <input type="hidden" name="position" value={position} />

        {/* 이미지 */}
        <div className="flex gap-4 items-center">
          <div
            className="rounded-lg overflow-hidden bg-[var(--color-notion-bg-soft)] border border-[var(--color-notion-rule)] shrink-0 relative flex items-center justify-center"
            style={{ width: 112, height: 72 }}
          >
            {imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePath}
                alt=""
                className="w-full h-full object-cover"
                style={{ opacity: opacity / 100 }}
              />
            ) : (
              <span className="text-[var(--color-notion-mute)] text-xs">없음</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="notion-icon-btn text-sm w-full justify-center disabled:opacity-50"
            >
              {uploading ? "업로드 중…" : "📁 이미지 업로드"}
            </button>
            {imagePath && (
              <p className="text-xs text-[var(--color-notion-mute)] font-mono truncate" title={imagePath}>
                {imagePath.split("/").pop() ?? imagePath}
              </p>
            )}
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          </div>
        </div>

        {/* 투명도 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--color-notion-mute)] uppercase tracking-wider">배경 진하기</span>
            <span className="text-sm font-mono tabular-nums">{opacity}%</span>
          </div>
          <input
            type="range" min={0} max={100} value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full h-1.5 accent-[var(--color-notion-accent)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--color-notion-mute)] mt-0.5">
            <span>투명 (0%)</span><span>진하게 (100%)</span>
          </div>
        </div>

        {/* 위치 */}
        <div>
          <label className="text-xs text-[var(--color-notion-mute)] uppercase tracking-wider block mb-1.5">이미지 위치</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="notion-input w-full border border-[var(--color-notion-rule)] text-sm"
          >
            <option value="center">가운데</option>
            <option value="top">위</option>
            <option value="bottom">아래</option>
            <option value="left">왼쪽</option>
            <option value="right">오른쪽</option>
          </select>
        </div>

        {/* 활성화 */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm">배경 이미지 활성화</span>
        </label>

        {state.error && <p className="text-xs text-red-500">{state.error}</p>}
        {state.ok && <p className="text-xs text-green-600">저장되었습니다.</p>}

        <div className="flex gap-2">
          <button
            type="submit" disabled={pending || !imagePath}
            className="notion-icon-btn flex-1 justify-center bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-40 text-sm h-9"
          >
            {pending ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>

      {imagePath && (
        <div className="px-5 pb-4">
          <form action={removeImageAction}>
            <input type="hidden" name="page" value={bg.page} />
            <button
              type="submit"
              className="text-xs text-red-500 hover:underline"
              onClick={(e) => { if (!confirm("이미지를 제거하고 배경을 비활성화할까요?")) e.preventDefault(); }}
            >
              이미지 제거 및 비활성화
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
