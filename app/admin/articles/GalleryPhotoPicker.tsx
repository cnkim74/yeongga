"use client";

import { useEffect, useMemo, useState } from "react";

type AlbumItem = {
  id: number;
  name: string;
  year: number | null;
  eventDate: string | null;
  cover: string | null;
  count: number;
  hidden: boolean;
};

type PhotoItem = {
  id: number;
  url: string;
  title: string | null;
  visibility: "public" | "members-only";
};

export type PickedPhoto = { src: string; alt: string };

/**
 * 글 편집기에서 사진 란(갤러리)에 올라간 사진을 골라 본문에 넣는 창.
 * 앨범을 고르고 사진을 여러 장 체크한 뒤 「본문에 넣기」를 누른다.
 */
export function GalleryPhotoPicker({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (photos: PickedPhoto[]) => void;
}) {
  const [albums, setAlbums] = useState<AlbumItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [album, setAlbum] = useState<AlbumItem | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 처음 열 때 앨범 목록을 불러온다
  useEffect(() => {
    if (!open || albums) return;
    fetch("/api/admin/gallery-photos")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAlbums(d.albums as AlbumItem[]))
      .catch(() => setError("앨범 목록을 불러오지 못했습니다."));
  }, [open, albums]);

  // 앨범을 고르면 그 사진을 불러온다
  useEffect(() => {
    if (!album) return;
    setPhotos(null);
    setPicked([]);
    fetch(`/api/admin/gallery-photos?album=${album.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPhotos(d.photos as PhotoItem[]))
      .catch(() => setError("사진을 불러오지 못했습니다."));
  }, [album]);

  const filtered = useMemo(() => {
    if (!albums) return [];
    const q = query.trim();
    // 사진이 한 장도 없는 앨범은 고를 게 없으니 뺀다
    const withPhotos = albums.filter((a) => a.count > 0);
    return q
      ? withPhotos.filter((a) => a.name.includes(q) || String(a.year ?? "").includes(q))
      : withPhotos;
  }, [albums, query]);

  if (!open) return null;

  const toggle = (id: number) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function insert() {
    if (!photos || picked.length === 0) return;
    // 고른 순서대로 넣는다
    const chosen = picked
      .map((id) => photos.find((p) => p.id === id))
      .filter((p): p is PhotoItem => Boolean(p));
    if (
      chosen.some((p) => p.visibility === "members-only") &&
      !window.confirm(
        "회원 전용으로 올린 사진이 포함되어 있습니다.\n글이 공개되면 누구나 볼 수 있게 됩니다. 그래도 넣을까요?"
      )
    ) {
      return;
    }
    onInsert(
      chosen.map((p) => ({ src: p.url, alt: p.title ?? album?.name ?? "" }))
    );
    setPicked([]);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-notion-rule)]">
          {album && (
            <button
              type="button"
              onClick={() => {
                setAlbum(null);
                setPhotos(null);
                setPicked([]);
              }}
              className="text-sm px-2 py-1 rounded hover:bg-[var(--color-notion-hover)]"
            >
              ← 앨범 목록
            </button>
          )}
          <div className="font-semibold text-sm flex-1 truncate">
            {album ? album.name : "사진 란에서 가져오기"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-lg leading-none px-2 text-[var(--color-notion-mute)]"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 text-sm text-red-700 bg-red-50">{error}</div>
        )}

        <div className="overflow-y-auto p-4 flex-1">
          {!album ? (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="앨범 이름·연도로 찾기 (예: 2011, 취임)"
                className="w-full border border-[var(--color-notion-rule)] rounded px-3 py-2 text-sm mb-3"
              />
              {!albums ? (
                <p className="text-sm text-[var(--color-notion-mute)]">불러오는 중…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-[var(--color-notion-mute)]">
                  찾는 앨범이 없습니다.
                </p>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filtered.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setAlbum(a)}
                        className="w-full text-left border border-[var(--color-notion-rule)] rounded overflow-hidden hover:border-[var(--color-notion-accent)]"
                      >
                        <div className="aspect-[4/3] bg-[var(--color-notion-hover)]">
                          {a.cover && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.cover}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="p-2">
                          <div className="text-xs text-[var(--color-notion-mute)]">
                            {a.year ?? "연도 미상"} · {a.count}장
                            {a.hidden ? " · 숨김" : ""}
                          </div>
                          <div className="text-sm leading-snug line-clamp-2">
                            {a.name}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : !photos ? (
            <p className="text-sm text-[var(--color-notion-mute)]">불러오는 중…</p>
          ) : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((p) => {
                const order = picked.indexOf(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`relative block w-full aspect-square overflow-hidden rounded border-2 ${
                        order >= 0
                          ? "border-[var(--color-notion-accent)]"
                          : "border-transparent"
                      }`}
                      title={p.title ?? ""}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.title ?? ""}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {order >= 0 && (
                        <span className="absolute top-1 left-1 bg-[var(--color-notion-accent)] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {order + 1}
                        </span>
                      )}
                      {p.visibility === "members-only" && (
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] rounded px-1">
                          회원전용
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {album && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--color-notion-rule)]">
            <span className="text-sm text-[var(--color-notion-mute)] flex-1">
              {picked.length > 0
                ? `${picked.length}장 선택 — ${
                    picked.length === 1 ? "사진 1장" : "사진 묶음(갤러리)"
                  }으로 들어갑니다`
                : "넣을 사진을 눌러 선택하세요 (여러 장 가능)"}
            </span>
            {photos && photos.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setPicked(picked.length === photos.length ? [] : photos.map((p) => p.id))
                }
                className="text-sm px-3 py-1.5 rounded border border-[var(--color-notion-rule)]"
              >
                {picked.length === photos.length ? "선택 해제" : "모두 선택"}
              </button>
            )}
            <button
              type="button"
              onClick={insert}
              disabled={picked.length === 0}
              className="text-sm px-3 py-1.5 rounded bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-40"
            >
              본문에 넣기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
