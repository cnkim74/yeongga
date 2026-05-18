"use client";

import { useState, useTransition } from "react";
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
  const [heroUrl, setHeroUrl] = useState(meta?.hero_image ?? "");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    meta?.display_mode ?? "latest"
  );
  const [featuredId, setFeaturedId] = useState<number | "">(
    meta?.featured_article_id ?? ""
  );
  const [visible, setVisible] = useState<boolean>(meta?.visible ?? true);
  const [position, setPosition] = useState(meta?.position ?? 0);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /** 공용 업로드 — kind 에 따라 파일 → URL 반환 */
  async function uploadImage(
    file: File,
    kind: "cover" | "hero"
  ): Promise<string | null> {
    setError(null);
    if (kind === "cover") setUploadingCover(true);
    else setUploadingHero(true);

    try {
      // 1) R2 클라이언트 직접 업로드 (4.5MB 우회)
      try {
        const { uploadToR2 } = await import("@/lib/r2-client");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const blob = await uploadToR2(safeName, file, {
          handleUploadUrl: "/api/upload/chapter-cover",
        });
        return blob.url;
      } catch {
        // 2) 로컬 폴백 multipart
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/chapter-cover", { method: "POST", body: fd });
        if (!res.ok) {
          if (res.status === 413) {
            setError(`파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 30MB 이하로 줄여 주세요.`);
          } else {
            setError(`업로드 실패 (HTTP ${res.status})`);
          }
          return null;
        }
        const json = await res.json();
        if (!json.ok) {
          setError(json.error ?? "업로드 실패");
          return null;
        }
        return json.url as string;
      }
    } catch (err) {
      setError(`업로드 중 오류: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      if (kind === "cover") setUploadingCover(false);
      else setUploadingHero(false);
    }
  }

  function handleSave() {
    setSaved(false);
    setError(null);
    const fd = new FormData();
    fd.set("chapter_slug", chapter.slug);
    fd.set("cover_image", coverUrl);
    fd.set("hero_image", heroUrl);
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
      {/* 헤더 */}
      <div className="flex items-baseline gap-3 mb-5">
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

      {/* 두 이미지 칸 — 메인 쇼케이스용 / 챕터 페이지 hero 용 */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <ImageSlot
          label="메인 쇼케이스 이미지"
          sub="홈 페이지의 챕터 카드 옆에 표시 (4:3 비율 권장)"
          aspectClass="aspect-[4/3]"
          imageUrl={coverUrl}
          uploading={uploadingCover}
          onUpload={async (f) => {
            const url = await uploadImage(f, "cover");
            if (url) setCoverUrl(url);
          }}
          onClear={() => setCoverUrl("")}
          chapterSlug={chapter.slug}
          chapterNumber={chapter.number}
        />
        <ImageSlot
          label="챕터 페이지 hero"
          sub="아카이브의 챕터 상단 풀블리드 (가로 와이드 권장)"
          aspectClass="aspect-[16/7]"
          imageUrl={heroUrl}
          uploading={uploadingHero}
          onUpload={async (f) => {
            const url = await uploadImage(f, "hero");
            if (url) setHeroUrl(url);
          }}
          onClear={() => setHeroUrl("")}
          chapterSlug={chapter.slug}
          chapterNumber={chapter.number}
        />
      </div>

      {/* 노출 옵션 */}
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
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

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || uploadingCover || uploadingHero}
          className="px-4 py-1.5 rounded-md bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "저장 중…" : "저장"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600">✓ 저장되었습니다</span>
        )}
      </div>
    </div>
  );
}

/** 이미지 슬롯 — 미리보기 + 업로드 + 제거 */
function ImageSlot({
  label,
  sub,
  aspectClass,
  imageUrl,
  uploading,
  onUpload,
  onClear,
  chapterSlug,
  chapterNumber,
}: {
  label: string;
  sub: string;
  aspectClass: string;
  imageUrl: string;
  uploading: boolean;
  onUpload: (f: File) => void;
  onClear: () => void;
  chapterSlug: string;
  chapterNumber: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--admin-ink)] mb-1">
        {label}
      </label>
      <div className="text-[11px] text-[var(--admin-mute)] mb-2">{sub}</div>
      <div
        className={`${aspectClass} rounded-md overflow-hidden bg-[var(--admin-bg)] border border-[var(--admin-rule)] relative mb-2`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[var(--admin-mute)]">
            <span className="font-serif text-3xl opacity-30">{chapterNumber}</span>
            <span className="text-[10px] tracking-widest">{chapterSlug}</span>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
        className="text-xs w-full file:mr-2 file:rounded file:border-0 file:bg-[var(--admin-hover)] file:px-2 file:py-1 file:text-xs file:cursor-pointer"
      />
      <div className="flex items-center gap-3 mt-1.5">
        {uploading && (
          <span className="text-[11px] text-[var(--admin-mute)]">업로드 중…</span>
        )}
        {imageUrl && !uploading && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-red-600 hover:underline"
          >
            이미지 제거
          </button>
        )}
      </div>
    </div>
  );
}
