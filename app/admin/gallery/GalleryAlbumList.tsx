"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteAlbumAction, mergeAlbumsAction, toggleAlbumHiddenAction } from "./actions";
import type { Album } from "@/lib/gallery-db";

export function GalleryAlbumList({ albums }: { albums: Album[] }) {
  // 앨범 합치기 — 카드에서 둘 이상 고르면 위에 합치기 막대가 나온다
  const [selected, setSelected] = useState<number[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [mergeName, setMergeName] = useState("");

  const chosen = albums.filter((a) => selected.includes(a.id));
  const chosenPhotos = chosen.reduce((n, a) => n + a.photo_count, 0);
  const target = chosen.find((a) => a.id === targetId) ?? null;

  const toggle = (id: number) => {
    setSelected((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return next;
    });
    setPanelOpen(false);
  };
  const openPanel = () => {
    // 사진이 가장 많은 앨범을 남길 앨범 기본값으로
    const best = [...chosen].sort((a, b) => b.photo_count - a.photo_count)[0];
    setTargetId(best?.id ?? null);
    setMergeName(best?.name ?? "");
    setPanelOpen(true);
  };
  const pickTarget = (a: Album) => {
    setTargetId(a.id);
    setMergeName(a.name);
  };
  const clear = () => {
    setSelected([]);
    setPanelOpen(false);
  };

  return (
    <div>
      <Link
        href="/admin/gallery/album/new"
        className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] mb-8 inline-block"
      >
        + 새 앨범 만들기
      </Link>

      {/* 합치기 막대 — 앨범을 하나라도 고르면 보인다 */}
      {selected.length > 0 && (
        <div className="sticky top-2 z-20 mb-6 rounded-xl border border-[var(--color-notion-rule)] bg-white p-4 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">
              <b>{selected.length}개</b> 앨범 선택 · 사진 {chosenPhotos}장
              {selected.length < 2 && (
                <span className="ml-2 text-[var(--color-notion-mute)]">합칠 앨범을 하나 더 골라 주세요.</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={clear} className="notion-icon-btn text-xs">
                선택 해제
              </button>
              {selected.length >= 2 && !panelOpen && (
                <button
                  type="button"
                  onClick={openPanel}
                  className="notion-icon-btn text-xs bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
                >
                  선택한 앨범 합치기
                </button>
              )}
            </div>
          </div>

          {panelOpen && selected.length >= 2 && (
            <form
              action={mergeAlbumsAction}
              onSubmit={(e) => {
                if (!target || !confirm(`"${target.name}" 앨범으로 합칩니다.\n나머지 앨범 ${chosen.length - 1}개는 목록에서 사라지고, 사진 ${chosenPhotos}장은 모두 "${target.name}"에 모입니다.\n(사진은 지워지지 않습니다)`)) {
                  e.preventDefault();
                }
              }}
              className="mt-4 border-t border-[var(--color-notion-rule)] pt-4"
            >
              {selected.map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              <div className="mb-2 text-sm font-medium">어느 앨범으로 모을까요? (이 앨범의 날짜·설명이 남습니다)</div>
              <ul className="mb-4 space-y-1.5">
                {chosen.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--color-notion-rule)] p-2 text-sm hover:bg-[var(--color-notion-hover)]">
                      <input
                        type="radio"
                        name="target"
                        value={a.id}
                        checked={targetId === a.id}
                        onChange={() => pickTarget(a)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{a.name}</span>
                        <span className="block text-xs text-[var(--color-notion-mute)]">
                          {a.year ? `${a.year}년` : "연도 미정"}
                          {a.event_date ? ` · ${a.event_date.replace(/-/g, ".")}` : ""} · 사진 {a.photo_count}장
                          {a.hidden ? " · 사이트에 안 보임" : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <label className="mb-4 block text-sm">
                <span className="mb-1 block font-medium">합친 앨범 이름</span>
                <input
                  name="name"
                  value={mergeName}
                  onChange={(e) => setMergeName(e.target.value)}
                  className="notion-input w-full border border-[var(--color-notion-rule)]"
                  placeholder="앨범 이름"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="notion-icon-btn text-xs bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
                >
                  합치기
                </button>
                <button type="button" onClick={() => setPanelOpen(false)} className="notion-icon-btn text-xs">
                  취소
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {albums.length === 0 ? (
        <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
          <div className="text-5xl mb-3">🖼️</div>
          <div className="text-base font-medium mb-1">아직 앨범이 없습니다</div>
          <div className="text-sm text-[var(--color-notion-mute)]">
            &quot;새 앨범 만들기&quot;로 제목·설명과 사진을 한 번에 올려 보세요.
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((al) => (
            <div
              key={al.id}
              className={`rounded-xl border overflow-hidden ${
                selected.includes(al.id)
                  ? "border-[var(--color-notion-accent)] ring-2 ring-[var(--color-notion-accent)]/40"
                  : "border-[var(--color-notion-rule)]"
              } ${al.hidden ? "bg-[var(--color-notion-hover)]" : ""}`}
            >
              <Link href={`/admin/gallery/album/${al.id}/edit`} className="block">
                <div className="relative aspect-[4/3] bg-[var(--color-notion-hover)] overflow-hidden">
                  {al.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={al.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-[var(--color-notion-mute)]">
                      🖼️
                    </div>
                  )}
                  {al.hidden && (
                    <span className="absolute inset-0 bg-white/55" aria-hidden="true" />
                  )}
                  {al.hidden && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#c4554d] text-white text-xs font-medium">
                      사이트에 안 보임
                    </span>
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-xs">
                    {al.photo_count}장
                  </span>
                </div>
              </Link>
              {/* 합치기 선택 */}
              <label className="flex cursor-pointer items-center gap-2 border-b border-[var(--color-notion-rule)] px-3 py-2 text-xs text-[var(--color-notion-mute)] hover:bg-[var(--color-notion-hover)]">
                <input
                  type="checkbox"
                  checked={selected.includes(al.id)}
                  onChange={() => toggle(al.id)}
                />
                합치기 선택
              </label>
              <div className="p-3">
                {/* 갤러리는 연도로 묶인다 — 어느 해 어느 날 행사인지 함께 보인다 */}
                <div className="text-xs text-[var(--color-notion-mute)] mb-0.5">
                  {al.year ? `${al.year}년` : "연도 미정"}
                  {al.event_date ? ` · ${al.event_date.replace(/-/g, ".")}` : ""}
                </div>
                <div className="font-medium truncate">{al.name}</div>
                {al.description && (
                  <p className="text-sm text-[var(--color-notion-mute)] line-clamp-2 mt-0.5">
                    {al.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    href={`/admin/gallery/album/${al.id}/edit`}
                    className="notion-icon-btn text-xs"
                  >
                    편집
                  </Link>
                  {!al.hidden && (
                    <Link
                      href={`/gallery?category=${al.slug}`}
                      target="_blank"
                      className="notion-icon-btn text-xs"
                    >
                      보기 ↗
                    </Link>
                  )}
                  <form action={toggleAlbumHiddenAction}>
                    <input type="hidden" name="id" value={al.id} />
                    <input type="hidden" name="hidden" value={al.hidden ? "0" : "1"} />
                    <button type="submit" className="notion-icon-btn text-xs">
                      {al.hidden ? "다시 보이기" : "숨기기"}
                    </button>
                  </form>
                  <form
                    action={deleteAlbumAction}
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `"${al.name}" 앨범과 사진 ${al.photo_count}장을 모두 삭제할까요? 되돌릴 수 없습니다.`
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                    className="ml-auto"
                  >
                    <input type="hidden" name="id" value={al.id} />
                    <button
                      type="submit"
                      className="notion-icon-btn text-xs text-[#c4554d] hover:bg-[#ffe2dd]"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
