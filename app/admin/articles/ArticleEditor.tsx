"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { FigureImage } from "./extensions/FigureImage";
import { ImageGallery, type GalleryImage } from "./extensions/ImageGallery";
import { Ornament, type OrnamentStyle } from "./extensions/Ornament";
import { EmojiPicker } from "./EmojiPicker";

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

async function uploadMany(files: File[]): Promise<string[]> {
  const urls = await Promise.all(files.map(uploadOne));
  return urls.filter((u): u is string => Boolean(u));
}

export function ArticleEditor({
  initialHTML,
  onChange,
}: {
  initialHTML: string;
  onChange: (html: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [ornamentMenuOpen, setOrnamentMenuOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({
        placeholder: "본문을 시작하세요…",
      }),
      FigureImage.configure({ inline: false }),
      ImageGallery,
      Ornament,
      Youtube.configure({
        nocookie: true,
        controls: true,
        modestBranding: true,
        width: 720,
        height: 405,
      }),
    ],
    content: initialHTML || "",
    editorProps: {
      attributes: {
        class:
          "tiptap article-editor min-h-[480px] outline-none px-6 py-6 prose-body",
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const files: File[] = [];
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
        if (files.length === 0) return false;
        event.preventDefault();
        insertImages(files);
        return true;
      },
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        insertImages(imageFiles);
        return true;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // 1장이면 단일 이미지, 2장 이상이면 갤러리로 삽입
  async function insertImages(files: File[]) {
    if (!editor || files.length === 0) return;
    const urls = await uploadMany(files);
    if (urls.length === 0) return;

    if (urls.length === 1) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src: urls[0], align: "center", width: "medium" },
        })
        .run();
    } else {
      const images: GalleryImage[] = urls.map((src) => ({
        src,
        alt: "",
        caption: null,
      }));
      const layout = urls.length >= 4 ? "grid-2" : urls.length === 3 ? "row-3" : "row-2";
      editor.chain().focus().insertImageGallery({ images, layout }).run();
    }
  }

  useEffect(() => {
    return () => editor?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) {
    return (
      <div className="border border-[var(--color-notion-rule)] rounded-md min-h-[480px] flex items-center justify-center text-[var(--color-notion-mute)]">
        에디터를 불러오는 중…
      </div>
    );
  }

  const isImageActive = editor.isActive("image");

  const insertOrnament = (style: OrnamentStyle) => {
    editor.chain().focus().insertOrnament(style).run();
    setOrnamentMenuOpen(false);
  };

  return (
    <div className="border border-[var(--color-notion-rule)] rounded-md overflow-hidden bg-white relative">
      {/* 메인 툴바 */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[var(--color-notion-rule)] bg-[var(--color-notion-sidebar)] sticky top-0 z-10">
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="굵게 (Cmd/Ctrl+B)"
        >
          <span className="font-bold">B</span>
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="기울임 (Cmd/Ctrl+I)"
        >
          <span className="italic">I</span>
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="취소선"
        >
          <span className="line-through">S</span>
        </ToolBtn>

        <Sep />

        <ToolBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="제목 H2"
        >
          H2
        </ToolBtn>
        <ToolBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="제목 H3"
        >
          H3
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="인용"
        >
          ❝
        </ToolBtn>

        <Sep />

        <ToolBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="목록"
        >
          •
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="번호 매기기"
        >
          1.
        </ToolBtn>

        {/* 장식 구분선 드롭다운 */}
        <div className="relative">
          <ToolBtn
            onClick={() => setOrnamentMenuOpen((s) => !s)}
            active={ornamentMenuOpen}
            title="구분선·장식"
          >
            ─
          </ToolBtn>
          {ornamentMenuOpen && (
            <div className="absolute z-30 mt-1 bg-white border border-[var(--color-notion-rule)] rounded-md shadow-lg py-1 w-[180px]">
              <OrnamentItem onClick={() => insertOrnament("line")} preview="─────">
                실선
              </OrnamentItem>
              <OrnamentItem onClick={() => insertOrnament("dots")} preview="·  ·  ·">
                점
              </OrnamentItem>
              <OrnamentItem onClick={() => insertOrnament("diamond")} preview="◆  ◆  ◆">
                마름모
              </OrnamentItem>
              <OrnamentItem onClick={() => insertOrnament("asterism")} preview="※  ※  ※">
                별표
              </OrnamentItem>
              <OrnamentItem onClick={() => insertOrnament("wave")} preview="～  ～  ～">
                물결
              </OrnamentItem>
            </div>
          )}
        </div>

        <Sep />

        {/* 이모티콘 */}
        <div className="relative">
          <ToolBtn
            onClick={() => setEmojiOpen((s) => !s)}
            active={emojiOpen}
            title="이모티콘"
          >
            😊
          </ToolBtn>
          <EmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onPick={(e) => editor.chain().focus().insertContent(e).run()}
          />
        </div>

        <ToolBtn
          onClick={() => {
            const prev = editor.getAttributes("link").href as
              | string
              | undefined;
            const url = window.prompt("링크 URL", prev ?? "https://");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          }}
          active={editor.isActive("link")}
          title="링크"
        >
          🔗
        </ToolBtn>
        <ToolBtn
          onClick={() => fileInputRef.current?.click()}
          title="이미지 / 갤러리 (여러 장 선택 가능)"
        >
          🖼️
        </ToolBtn>
        <ToolBtn
          onClick={() => {
            const url = window.prompt(
              "YouTube URL을 붙여 넣으세요",
              "https://www.youtube.com/watch?v="
            );
            if (!url) return;
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
          }}
          title="YouTube 임베드"
        >
          ▶
        </ToolBtn>

        <Sep />

        <ToolBtn
          onClick={() => editor.chain().focus().undo().run()}
          title="되돌리기 (Cmd/Ctrl+Z)"
        >
          ↶
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().redo().run()}
          title="다시 (Cmd/Ctrl+Shift+Z)"
        >
          ↷
        </ToolBtn>
      </div>

      {/* 단일 이미지 선택 시 인라인 컨트롤 */}
      {isImageActive && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[var(--color-notion-rule)] bg-[#fff8e6] text-xs sticky top-[44px] z-10">
          <span className="text-[var(--color-notion-mute)] mr-2">선택된 이미지</span>
          <span className="text-[var(--color-notion-mute)]">정렬</span>
          {(["left", "center", "right"] as const).map((a) => (
            <ToolBtn
              key={a}
              size="sm"
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { align: a }).run()
              }
              active={editor.getAttributes("image").align === a}
              title={`정렬: ${a === "left" ? "왼쪽" : a === "right" ? "오른쪽" : "가운데"}`}
            >
              {a === "left" ? "←" : a === "right" ? "→" : "↔"}
            </ToolBtn>
          ))}
          <Sep />
          <span className="text-[var(--color-notion-mute)]">크기</span>
          {(
            [
              ["small", "S"],
              ["medium", "M"],
              ["large", "L"],
              ["full", "꽉"],
            ] as const
          ).map(([w, label]) => (
            <ToolBtn
              key={w}
              size="sm"
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { width: w }).run()
              }
              active={editor.getAttributes("image").width === w}
              title={`크기: ${label}`}
            >
              {label}
            </ToolBtn>
          ))}
          <Sep />
          <ToolBtn
            size="sm"
            onClick={() => {
              const cur = (editor.getAttributes("image").caption as string) ?? "";
              const next = window.prompt("이미지 설명 (캡션)", cur);
              if (next === null) return;
              editor
                .chain()
                .focus()
                .updateAttributes("image", { caption: next || null })
                .run();
            }}
            title="캡션 편집"
          >
            ✎ 캡션
          </ToolBtn>
          <ToolBtn
            size="sm"
            onClick={() => editor.chain().focus().deleteSelection().run()}
            title="이미지 삭제"
          >
            🗑
          </ToolBtn>
        </div>
      )}

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = "";
          if (files.length === 0) return;
          await insertImages(files);
        }}
      />
    </div>
  );
}

function ToolBtn({
  onClick,
  active,
  children,
  title,
  size = "md",
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md";
}) {
  const base =
    size === "sm"
      ? "h-6 min-w-6 px-1.5 text-xs"
      : "h-8 min-w-8 px-2 text-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${base} rounded inline-flex items-center justify-center hover:bg-[var(--color-notion-hover)] ${
        active
          ? "bg-[var(--color-notion-text)] text-white hover:bg-[var(--color-notion-text)]"
          : "text-[var(--color-notion-text)]"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-5 bg-[var(--color-notion-rule)] mx-1" />;
}

function OrnamentItem({
  onClick,
  preview,
  children,
}: {
  onClick: () => void;
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2 text-left hover:bg-[var(--color-notion-hover)] flex items-center gap-3 text-sm"
    >
      <span className="text-[var(--color-notion-mute)] font-mono w-20">
        {preview}
      </span>
      <span>{children}</span>
    </button>
  );
}
