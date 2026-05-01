"use client";

import { useEffect, useRef, useState } from "react";

const GROUPS: { name: string; emojis: string[] }[] = [
  {
    name: "마음",
    emojis: ["😊", "🙂", "😄", "😢", "🥲", "🥹", "😍", "🤗", "🙏", "💝", "❤️", "💛", "💚", "💙", "💜"],
  },
  {
    name: "자연",
    emojis: ["🌸", "🌹", "🌻", "🍀", "🍂", "🍁", "🌾", "🌿", "🌷", "🌳", "🌲", "🌊", "🌙", "☀️", "❄️", "🌧️"],
  },
  {
    name: "생활",
    emojis: ["📖", "📚", "✉️", "✏️", "🖋️", "📷", "🎵", "🎶", "🎁", "🍵", "🍶", "🍱", "🎂", "🍎", "🥢", "🪑"],
  },
  {
    name: "기호",
    emojis: ["✨", "⭐", "🌟", "💫", "✅", "❇️", "♥", "♣", "♠", "♦", "✿", "❀", "❁", "❄", "✦", "✩"],
  },
  {
    name: "사람",
    emojis: ["👴", "👵", "👨", "👩", "🧑", "👶", "👨‍👩‍👧", "👨‍👩‍👦", "🤝", "👋", "🙌", "💐", "🎓", "🎉", "🥂", "👀"],
  },
];

export function EmojiPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [groupIdx, setGroupIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="emoji-picker absolute z-30 mt-1 bg-white border border-[var(--color-notion-rule)] rounded-md shadow-lg p-2 w-[280px]"
    >
      <div className="flex gap-1 mb-2 border-b border-[var(--color-notion-rule)] pb-2">
        {GROUPS.map((g, i) => (
          <button
            key={g.name}
            type="button"
            onClick={() => setGroupIdx(i)}
            className={`px-2 py-1 text-xs rounded ${
              groupIdx === i
                ? "bg-[var(--color-notion-text)] text-white"
                : "hover:bg-[var(--color-notion-hover)]"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {GROUPS[groupIdx].emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              onPick(e);
              onClose();
            }}
            className="h-8 w-8 hover:bg-[var(--color-notion-hover)] rounded text-lg leading-none flex items-center justify-center"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
