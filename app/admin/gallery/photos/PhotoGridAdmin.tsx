"use client";

/**
 * 사진 관리 그리드 — 카드 인라인 편집 + 일괄 처리.
 *
 * 한 장씩:
 *   · 카드 위 카테고리 드롭다운 (즉시 변경)
 *   · ✏️ 버튼 → 카드 펼침 → 제목/설명/촬영일/공개범위 한자리 편집
 *   · 삭제 버튼 (확인 후)
 *
 * 여러 장:
 *   · 체크박스로 선택
 *   · 화면 상단 sticky 〈일괄 처리 바〉 — 카테고리 변경 / 공개 범위 / 삭제 / 선택 해제
 */

import { useState, useTransition } from "react";
import type { Photo, PhotoCategory } from "@/lib/gallery-db";
import {
  bulkDeletePhotosAction,
  bulkUpdatePhotosAction,
  deletePhotoAction,
  quickUpdatePhotoAction,
} from "../actions";

export function PhotoGridAdmin({
  photos,
  categories,
}: {
  photos: Photo[];
  categories: PhotoCategory[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function toggle(id: number, checked: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(photos.map((p) => p.id)));
  }
  function deselectAll() {
    setSelected(new Set());
  }

  if (photos.length === 0) {
    return (
      <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
        <div className="text-5xl mb-3">📷</div>
        <div className="text-base font-medium mb-1">아직 사진이 없습니다</div>
        <div className="text-sm text-[var(--color-notion-mute)]">
          위의 업로드 폼을 이용해 첫 번째 사진을 추가해 보세요.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">사진 목록 ({photos.length})</h2>
        <div className="flex items-center gap-2 text-xs text-[var(--color-notion-mute)]">
          {selected.size === 0 ? (
            <button
              type="button"
              onClick={selectAll}
              className="underline hover:text-[var(--color-notion-ink)]"
            >
              전체 선택
            </button>
          ) : (
            <>
              <span>{selected.size}장 선택됨</span>
              <button
                type="button"
                onClick={deselectAll}
                className="underline hover:text-[var(--color-notion-ink)]"
              >
                선택 해제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 일괄 처리 바 — 선택된 게 있을 때만 */}
      {selected.size > 0 && (
        <BulkActionBar
          ids={Array.from(selected)}
          categories={categories}
          onDone={deselectAll}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            categories={categories}
            selected={selected.has(photo.id)}
            onToggleSelect={(checked) => toggle(photo.id, checked)}
            expanded={expandedId === photo.id}
            onExpand={(open) => setExpandedId(open ? photo.id : null)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── 일괄 처리 바 ─── */

function BulkActionBar({
  ids,
  categories,
  onDone,
}: {
  ids: number[];
  categories: PhotoCategory[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [, setMsg] = useState<string | null>(null);

  function changeCategory(value: string) {
    if (!value) return;
    const category_id = value === "null" ? null : Number(value);
    startTransition(async () => {
      const r = await bulkUpdatePhotosAction({ ids, category_id });
      if ("ok" in r) {
        setMsg(`${r.count}장 카테고리 변경 완료`);
        onDone();
      } else if ("error" in r) {
        setMsg(r.error ?? "오류");
      }
    });
  }

  function changeVisibility(value: "public" | "members-only") {
    startTransition(async () => {
      const r = await bulkUpdatePhotosAction({ ids, visibility: value });
      if ("ok" in r) {
        setMsg(`${r.count}장 공개 범위 변경 완료`);
        onDone();
      } else if ("error" in r) {
        setMsg(r.error ?? "오류");
      }
    });
  }

  function doDelete() {
    if (!confirm(`${ids.length}장의 사진을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      const r = await bulkDeletePhotosAction({ ids });
      if ("ok" in r) {
        setMsg(`${r.count}장 삭제 완료`);
        onDone();
      }
    });
  }

  return (
    <div className="sticky top-2 z-10 mb-4 rounded-lg border border-[var(--color-notion-accent)] bg-blue-50 px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="text-sm font-semibold text-[var(--color-notion-ink)]">
        {ids.length}장 선택됨
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-[var(--color-notion-mute)]">카테고리</label>
        <select
          disabled={pending}
          onChange={(e) => changeCategory(e.target.value)}
          defaultValue=""
          className="notion-input text-sm py-1"
        >
          <option value="" disabled>— 변경 —</option>
          <option value="null">미분류</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-[var(--color-notion-mute)]">공개</label>
        <select
          disabled={pending}
          onChange={(e) => changeVisibility(e.target.value as "public" | "members-only")}
          defaultValue=""
          className="notion-input text-sm py-1"
        >
          <option value="" disabled>— 변경 —</option>
          <option value="public">전체 공개</option>
          <option value="members-only">회원 전용</option>
        </select>
      </div>

      <button
        type="button"
        onClick={doDelete}
        disabled={pending}
        className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50 ml-auto"
      >
        선택 삭제
      </button>

      {pending && (
        <span className="text-xs text-[var(--color-notion-mute)]">처리 중…</span>
      )}
    </div>
  );
}

/* ─── 사진 카드 ─── */

function PhotoCard({
  photo,
  categories,
  selected,
  onToggleSelect,
  expanded,
  onExpand,
}: {
  photo: Photo;
  categories: PhotoCategory[];
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  expanded: boolean;
  onExpand: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function quickChangeCategory(value: string) {
    const category_id = value === "" ? null : Number(value);
    startTransition(async () => {
      await quickUpdatePhotoAction({ id: photo.id, category_id });
    });
  }

  return (
    <div
      className={`relative border rounded-lg overflow-hidden transition ${
        selected
          ? "border-[var(--color-notion-accent)] ring-2 ring-blue-200"
          : "border-[var(--color-notion-rule)]"
      }`}
    >
      {/* 체크박스 */}
      <label className="absolute top-1.5 left-1.5 z-10 cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelect(e.target.checked)}
          className="w-5 h-5 rounded cursor-pointer accent-[var(--color-notion-accent)]"
        />
      </label>

      {/* 이미지 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.image_url}
        alt={photo.title ?? ""}
        className="w-full aspect-square object-cover bg-gray-100"
        loading="lazy"
      />

      {/* 카드 메타 영역 */}
      <div className="p-2 space-y-1.5">
        {photo.title && (
          <p className="text-xs font-medium truncate" title={photo.title}>
            {photo.title}
          </p>
        )}

        {/* 카테고리 인라인 드롭다운 — 즉시 변경 */}
        <select
          disabled={pending}
          value={photo.category_id ?? ""}
          onChange={(e) => quickChangeCategory(e.target.value)}
          className="w-full text-xs px-1.5 py-1 rounded border border-[var(--color-notion-rule)] bg-white"
          aria-label="카테고리"
        >
          <option value="">미분류</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex items-center justify-between text-xs text-[var(--color-notion-mute)]">
          <span>{photo.visibility === "members-only" ? "🔒 회원" : "🌐 공개"}</span>
          <button
            type="button"
            onClick={() => onExpand(!expanded)}
            className="px-1.5 py-0.5 rounded hover:bg-[var(--color-notion-hover)] text-[var(--color-notion-ink)]"
            title="자세히 편집"
          >
            ✏️ 편집
          </button>
        </div>
      </div>

      {/* 펼침 — 자세히 편집 */}
      {expanded && (
        <DetailEditPanel
          photo={photo}
          onClose={() => onExpand(false)}
        />
      )}

      {/* 삭제 (호버 시) — 펼친 상태 아닐 때만 */}
      {!expanded && (
        <form
          action={deletePhotoAction}
          onSubmit={(e) => {
            if (!confirm("이 사진을 삭제할까요? 되돌릴 수 없습니다.")) {
              e.preventDefault();
            }
          }}
          className="absolute top-1.5 right-1.5 opacity-0 hover:opacity-100 transition"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <input type="hidden" name="id" value={photo.id} />
          <button
            type="submit"
            className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-700"
            title="삭제"
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── 자세히 편집 펼침 ─── */

function DetailEditPanel({
  photo,
  onClose,
}: {
  photo: Photo;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(photo.title ?? "");
  const [description, setDescription] = useState(photo.description ?? "");
  const [takenAt, setTakenAt] = useState(photo.taken_at ?? "");
  const [visibility, setVisibility] = useState<"public" | "members-only">(
    photo.visibility ?? "public"
  );
  const [position, setPosition] = useState<number>(photo.position ?? 0);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function save() {
    startTransition(async () => {
      const r = await quickUpdatePhotoAction({
        id: photo.id,
        title: title.trim() || null,
        description: description.trim() || null,
        taken_at: takenAt || null,
        visibility,
        position,
      });
      if ("ok" in r) setSavedAt(Date.now());
    });
  }

  return (
    <div className="border-t border-[var(--color-notion-rule)] bg-[var(--color-notion-hover)] p-3 space-y-2 text-xs">
      <div>
        <label className="block text-[var(--color-notion-mute)] mb-0.5">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2 py-1 rounded border border-[var(--color-notion-rule)] bg-white"
          placeholder="(비움 = 제목 없음)"
        />
      </div>
      <div>
        <label className="block text-[var(--color-notion-mute)] mb-0.5">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-2 py-1 rounded border border-[var(--color-notion-rule)] bg-white resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[var(--color-notion-mute)] mb-0.5">촬영일</label>
          <input
            type="date"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            className="w-full px-2 py-1 rounded border border-[var(--color-notion-rule)] bg-white"
          />
        </div>
        <div>
          <label className="block text-[var(--color-notion-mute)] mb-0.5">순서</label>
          <input
            type="number"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value) || 0)}
            className="w-full px-2 py-1 rounded border border-[var(--color-notion-rule)] bg-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-[var(--color-notion-mute)] mb-0.5">공개 범위</label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "public" | "members-only")}
          className="w-full px-2 py-1 rounded border border-[var(--color-notion-rule)] bg-white"
        >
          <option value="public">전체 공개</option>
          <option value="members-only">회원 전용</option>
        </select>
      </div>
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="px-3 py-1 rounded bg-[var(--color-notion-accent)] text-white text-xs font-medium hover:bg-[#1a6dbf] disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <div className="flex items-center gap-2">
          {savedAt && Date.now() - savedAt < 2000 && (
            <span className="text-emerald-600">✓ 저장됨</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-notion-mute)] hover:text-[var(--color-notion-ink)]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
