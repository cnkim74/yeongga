"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { FigureImage } from "./extensions/FigureImage";

async function uploadImage(file: File): Promise<string | null> {
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

export function ArticleEditor({
  initialHTML,
  onChange,
}: {
  initialHTML: string;
  onChange: (html: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false, // SSR 안전
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
          "tiptap article-editor min-h-[420px] outline-none px-6 py-6 prose-body",
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              uploadImage(file).then((url) => {
                if (url) {
                  editor
                    ?.chain()
                    .focus()
                    .insertContent({
                      type: "image",
                      attrs: {
                        src: url,
                        align: "center",
                        width: "medium",
                      },
                    })
                    .run();
                }
              });
              return true;
            }
          }
        }
        return false;
      },
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        imageFiles.forEach((file) => {
          uploadImage(file).then((url) => {
            if (url) {
              editor
                ?.chain()
                .focus()
                .insertContent({
                  type: "image",
                  attrs: {
                    src: url,
                    align: "center",
                    width: "medium",
                  },
                })
                .run();
            }
          });
        });
        return true;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    return () => editor?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) {
    return (
      <div className="border border-[var(--color-notion-rule)] rounded-md min-h-[420px] flex items-center justify-center text-[var(--color-notion-mute)]">
        에디터를 불러오는 중…
      </div>
    );
  }

  const isImageActive = editor.isActive("image");

  return (
    <div className="border border-[var(--color-notion-rule)] rounded-md overflow-hidden bg-white">
      {/* 메인 툴바 */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[var(--color-notion-rule)] bg-[var(--color-notion-sidebar)]">
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
        <ToolBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="구분선"
        >
          ─
        </ToolBtn>

        <Sep />

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
          title="이미지 추가 (드래그·붙여넣기도 됨)"
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

      {/* 이미지 선택 시 인라인 컨트롤 */}
      {isImageActive && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[var(--color-notion-rule)] bg-[#fff8e6] text-xs">
          <span className="text-[var(--color-notion-mute)] mr-2">
            선택된 이미지
          </span>
          <span className="text-[var(--color-notion-mute)]">정렬</span>
          {(["left", "center", "right"] as const).map((a) => (
            <ToolBtn
              key={a}
              size="sm"
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { align: a }).run()
              }
              active={editor.getAttributes("image").align === a}
              title={`정렬: ${
                a === "left" ? "왼쪽" : a === "right" ? "오른쪽" : "가운데"
              }`}
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
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const url = await uploadImage(file);
          if (url) {
            editor
              .chain()
              .focus()
              .insertContent({
                type: "image",
                attrs: { src: url, align: "center", width: "medium" },
              })
              .run();
          }
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
