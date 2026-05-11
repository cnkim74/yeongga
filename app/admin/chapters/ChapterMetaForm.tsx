"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { saveChapterMetaAction } from "./actions";
import type { Chapter } from "@/lib/chapters";
import type { ChapterMeta, DisplayMode } from "@/lib/chapter-meta-db";

type ArticleOpt = { id: number; title: string; date: string };

export function ChapterMetaForm({
  chapter,
  meta,
  articles,
}: {
  chapter: Chapter;
  meta: ChapterMeta | null;
  articles: ArticleOpt[];
}) {
  const [coverUrl, setCoverUrl] = useState(meta?.cover_image ?? "");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    meta?.display_mode ?? "latest"
  );
  const [featuredId, setFeaturedId] = useState<number | "">(
    meta?.featured_article_id ?? ""
  );
  const [visible, setVisible] = useState<boolean>(meta?.visible ?? true);
  const [position, setPosition] = useState(meta?.position ?? 0);

  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function uploadCover(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/chapter-cover", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "업로드 실패");
      } else {
        setCoverUrl(json.url);
      }
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    setSaved(false);
    setError(null);
    const fd = new FormData();
    fd.set("chapter_slug", chapter.slug);
    fd.set("cover_image", coverUrl);
    fd.set("display_mode", displayMode);
    if (displayMode === "featured" && featuredId !== "") {
      fd.set("featured_article_id", String(featuredId));
    }
    fd.set("visible", visible ? "1" : "0");
    fd.set("position", String(position));

    startTransition(async () => {
      const result = await saveChapterMetaAction(fd);
      if (result?.error) setError(result.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    });
  }

  return (
    <div className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] p-5">
      <div className="flex gap-5 items-start">
        {/* 미리보기 */}
        <div className="shrink-0 w-32 sm:w-40 aspect-[4/3] rounded-md overflow-hidden bg-[var(--admin-bg)] border border-[var(--admin-rule)] relative">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--admin-mute)] text-xs">
              이미지 없음
            </div>
          )}
        </div>

        {/* 폼 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-3">
            <h3 className="font-serif text-xl text-[var(--admin-ink)]">
              {chapter.number}. {chapter.title}
            </h3>
            <span className="text-xs text-[var(--admin-mute)] tracking-widest">
              {chapter.subtitle}
            </span>
            <span className="ml-auto text-[10px] font-mono text-[var(--admin-mute)] uppercase">
              {chapter.slug}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {/* 대표 이미지 업로드 */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--admin-ink)] mb-1.5">
                대표 이미지
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCover(f);
                }}
                className="text-sm w-full file:mr-3 file:rounded file:border-0 file:bg-[var(--admin-hover)] file:px-3 file:py-1 file:text-sm file:cursor-pointer"
              />
              {uploading && (
                <p className="mt-1 text-xs text-[var(--admin-mute)]">업로드 중…</p>
              )}
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl("")}
                  className="mt-1 text-xs text-red-600 hover:underline"
                >
                  이미지 제거
                </button>
              )}
            </div>

            {/* 노출 방식 */}
            <div>
              <label className="block text-xs font-medium text-[var(--admin-ink)] mb-1.5">
                노출 방식
              </label>
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                className="notion-input w-full"
              >
                <option value="latest">최신 — 가장 최근 글</option>
                <option value="featured">추천 — 지정된 글</option>
                <option value="random">랜덤 — 챕터 내 무작위</option>
              </select>
            </div>

            {/* 추천 글 선택 (featured 모드일 때만) */}
            {displayMode === "featured" && (
              <div>
                <label className="block text-xs font-medium text-[var(--admin-ink)] mb-1.5">
                  추천 글
                </label>
                <select
                  value={featuredId === "" ? "" : String(featuredId)}
                  onChange={(e) =>
                    setFeaturedId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="notion-input w-full"
                >
                  <option value="">— 선택 —</option>
                  {articles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.date.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 노출 위치 */}
            <div>
              <label className="block text-xs font-medium text-[var(--admin-ink)] mb-1.5">
                노출 순서 (낮을수록 앞)
              </label>
              <input
                type="number"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value) || 0)}
                className="notion-input w-32"
              />
            </div>

            {/* 보임/숨김 */}
            <div className="flex items-center gap-2 pt-5">
              <input
                id={`visible-${chapter.slug}`}
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
              />
              <label
                htmlFor={`visible-${chapter.slug}`}
                className="text-sm text-[var(--admin-ink)]"
              >
                메인 페이지에 노출
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || uploading}
              className="px-4 py-1.5 rounded-md bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "저장 중…" : "저장"}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600">✓ 저장되었습니다</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
