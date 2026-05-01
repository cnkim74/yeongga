"use client";

import { useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { GalleryImage, GalleryLayout } from "./extensions/ImageGallery";

async function uploadOne(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/article-image", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error ?? "이미지 업로드에 실패했습니다.");
    return null;
  }
  const data = await res.json();
  return data.url;
}

const LAYOUTS: { key: GalleryLayout; label: string }[] = [
  { key: "row-2", label: "가로 2장" },
  { key: "row-3", label: "가로 3장" },
  { key: "row-4", label: "가로 4장" },
  { key: "grid-2", label: "2열 격자" },
  { key: "grid-3", label: "3열 격자" },
  { key: "stack", label: "세로 쌓기" },
];

export function ImageGalleryView({
  node,
  updateAttributes,
  selected,
  deleteNode,
}: NodeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = (node.attrs.images ?? []) as GalleryImage[];
  const layout = (node.attrs.layout ?? "row-2") as GalleryLayout;

  const setImages = (next: GalleryImage[]) =>
    updateAttributes({ images: next });

  const updateImage = (idx: number, patch: Partial<GalleryImage>) => {
    const next = images.slice();
    next[idx] = { ...next[idx], ...patch };
    setImages(next);
  };

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    if (next.length === 0) {
      deleteNode();
      return;
    }
    setImages(next);
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    setImages(next);
  };

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (arr.length === 0) return;
    const urls = await Promise.all(arr.map(uploadOne));
    const newImages = urls
      .filter((u): u is string => Boolean(u))
      .map((src) => ({ src, alt: "", caption: null }));
    if (newImages.length > 0) setImages([...images, ...newImages]);
  };

  return (
    <NodeViewWrapper
      className={`image-gallery-wrap${selected ? " is-selected" : ""}`}
    >
      {selected && (
        <div className="gallery-toolbar">
          <span className="gallery-toolbar-label">레이아웃</span>
          {LAYOUTS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`gallery-tool-btn${
                layout === opt.key ? " is-active" : ""
              }`}
              onClick={() => updateAttributes({ layout: opt.key })}
              title={opt.label}
            >
              {opt.label}
            </button>
          ))}
          <span className="gallery-toolbar-sep" />
          <button
            type="button"
            className="gallery-tool-btn"
            onClick={() => fileInputRef.current?.click()}
            title="사진 추가"
          >
            + 사진 추가
          </button>
          <button
            type="button"
            className="gallery-tool-btn gallery-tool-btn-danger"
            onClick={() => deleteNode()}
            title="갤러리 전체 삭제"
          >
            🗑 전체
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className={`image-gallery layout-${layout}`}>
        {images.map((img, idx) => (
          <figure key={`${img.src}-${idx}`} className="gallery-item">
            <img src={img.src} alt={img.alt ?? ""} />
            {img.caption && <figcaption>{img.caption}</figcaption>}
            {selected && (
              <div className="gallery-item-controls">
                <button
                  type="button"
                  onClick={() => moveImage(idx, -1)}
                  disabled={idx === 0}
                  title="앞으로"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(idx, 1)}
                  disabled={idx === images.length - 1}
                  title="뒤로"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cur = img.caption ?? "";
                    const next = window.prompt("캡션", cur);
                    if (next === null) return;
                    updateImage(idx, { caption: next || null });
                  }}
                  title="캡션 편집"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  title="이 사진 삭제"
                  className="danger"
                >
                  ×
                </button>
              </div>
            )}
          </figure>
        ))}
      </div>
    </NodeViewWrapper>
  );
}
