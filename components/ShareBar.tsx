"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface ShareBarProps {
  title: string;
  path: string;       // e.g. /archive/yeongi/1977-...
  excerpt?: string | null;
}

const SITE = "https://yeongga.com";

export function ShareBar({ title, path, excerpt }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE}${path}`;

  /* ─ 링크 복사 ─────────────────────────────────────────────── */
  async function copyLink() {
    trackEvent("share_click", { method: "copy", content_path: path });
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 폴백: execCommand
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ─ 카카오톡 ────────────────────────────────────────────────
     모바일: navigator.share → 기기 공유 시트(카카오톡 포함)
     데스크탑: 팝업 창 열기 불가 → 링크 복사로 안내              */
  async function shareKakao() {
    trackEvent("share_click", { method: "kakao", content_path: path });
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: excerpt ?? title,
          url,
        });
        return;
      } catch {}
    }
    // 데스크탑 폴백 — 카카오톡 공유 웹 URL
    window.open(
      `https://story.kakao.com/share?url=${encodeURIComponent(url)}`,
      "kakao",
      "width=500,height=600,noopener,noreferrer"
    );
  }

  /* ─ 팝업 공유 헬퍼 ─────────────────────────────────────────── */
  function popup(shareUrl: string, method: "facebook" | "x") {
    trackEvent("share_click", { method, content_path: path });
    window.open(
      shareUrl,
      "share",
      "width=600,height=480,noopener,noreferrer"
    );
  }

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-xs text-[var(--color-ink-mute)] font-mono tracking-widest mr-1 hidden sm:inline">
        SHARE
      </span>

      {/* 카카오톡 */}
      <ShareBtn onClick={shareKakao} label="카카오톡" color="#FEE500" textColor="#000">
        <KakaoIcon />
      </ShareBtn>

      {/* Facebook */}
      <ShareBtn onClick={() => popup(fbUrl, "facebook")} label="Facebook" color="#1877F2" textColor="#fff">
        <FacebookIcon />
      </ShareBtn>

      {/* X (구 트위터) */}
      <ShareBtn onClick={() => popup(xUrl, "x")} label="X" color="#000" textColor="#fff">
        <XIcon />
      </ShareBtn>

      {/* 링크 복사 */}
      <button
        onClick={copyLink}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition
          ${copied
            ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]"
            : "border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
          }`}
        aria-label="링크 복사"
      >
        <LinkIcon copied={copied} />
        <span>{copied ? "복사됨!" : "링크 복사"}</span>
      </button>
    </div>
  );
}

/* ─── 버튼 래퍼 ────────────────────────────────────────────────── */
function ShareBtn({
  onClick,
  label,
  color,
  textColor,
  children,
}: {
  onClick: () => void;
  label: string;
  color: string;
  textColor: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label}로 공유`}
      title={`${label}로 공유`}
      style={{ backgroundColor: color, color: textColor }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition opacity-90 hover:opacity-100"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

/* ─── 아이콘 ────────────────────────────────────────────────────── */
function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M12 3C6.477 3 2 6.477 2 10.818c0 2.756 1.618 5.184 4.076 6.664l-.98 3.643c-.084.313.266.567.536.38L9.66 19.19A11.4 11.4 0 0 0 12 19.636c5.523 0 10-3.477 10-7.818S17.523 3 12 3z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}
