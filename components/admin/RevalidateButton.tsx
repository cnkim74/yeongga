"use client";

import { useState } from "react";

// 앱 밖에서 DB 를 직접 고쳤을 때 목록 캐시(최대 30분)를 즉시 비운다.
export function RevalidateButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function run() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/revalidate", { method: "POST" });
      setState(res.ok ? "done" : "error");
      if (res.ok) setTimeout(() => window.location.reload(), 800);
    } catch {
      setState("error");
    }
  }

  const label =
    state === "loading" ? "새로고침 중…"
    : state === "done" ? "✓ 새로고침 완료"
    : state === "error" ? "실패 — 다시 시도"
    : "🔄 목록 캐시 새로고침";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-rule,#ddd)] px-4 py-2 text-sm font-medium transition hover:bg-black/5 disabled:opacity-50"
      >
        {label}
      </button>
      <span className="text-xs text-[var(--admin-mute,#888)]">
        글 목록이 최신으로 안 보일 때 눌러 주세요.
      </span>
    </div>
  );
}
