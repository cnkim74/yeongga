"use client";

import { useState } from "react";
import { listRevisionsAction, loadRevisionAction } from "./actions";
import type { ArticleRevisionMeta } from "@/lib/articles-db";

function countLayoutBlocks(html: string): number {
  return (html.match(/<div class="(ygpr|ygcl)-/g) ?? []).length;
}

function formatKST(savedAt: string): string {
  const d = new Date(savedAt.replace(" ", "T") + "Z");
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 편집기 위 — 깨진 카드 틀(스타일)을 되살리거나 이전 저장본으로 돌아가는 패널.
// 불러오기는 편집기 내용만 바꾸고, 사이트 반영은 [저장]을 눌러야 된다.
export function RevisionPanel({
  articleId,
  currentHTML,
  onLoad,
}: {
  articleId: number;
  currentHTML: string;
  onLoad: (html: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{
    revisions: ArticleRevisionMeta[];
    fileLayoutBlocks: number | null;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [beforeLoad, setBeforeLoad] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data) {
      setBusy("list");
      try {
        setData(await listRevisionsAction(articleId));
      } finally {
        setBusy(null);
      }
    }
  }

  async function load(rev: number | "file", label: string) {
    if (
      !confirm(
        `편집 중인 본문을 「${label}」(으)로 바꿉니다.\n바꾼 뒤 [저장]을 눌러야 사이트에 반영됩니다.`
      )
    )
      return;
    setBusy(String(rev));
    try {
      const html = await loadRevisionAction(articleId, rev);
      if (html == null) {
        setNotice("이 버전을 찾지 못했습니다.");
        return;
      }
      setBeforeLoad(currentHTML);
      onLoad(html);
      setNotice(`「${label}」을(를) 불러왔습니다. 확인한 뒤 [저장]을 누르세요.`);
    } finally {
      setBusy(null);
    }
  }

  function undoLoad() {
    if (beforeLoad == null) return;
    onLoad(beforeLoad);
    setBeforeLoad(null);
    setNotice("불러오기 전 본문으로 되돌렸습니다.");
  }

  const current = countLayoutBlocks(currentHTML);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={toggle}
        className="notion-icon-btn text-xs border border-[var(--color-notion-rule)]"
      >
        🕘 스타일·이전 버전 복원 {open ? "▴" : "▾"}
      </button>

      {notice && (
        <div className="mt-2 text-xs rounded-md px-3 py-2 bg-[var(--color-notion-hover)] flex items-center gap-3">
          <span>{notice}</span>
          {beforeLoad != null && (
            <button type="button" onClick={undoLoad} className="underline shrink-0">
              ↩ 불러오기 전으로
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="mt-2 border border-[var(--color-notion-rule)] rounded-lg p-3 text-sm space-y-2">
          <div className="text-xs text-[var(--color-notion-mute)]">
            지금 편집 중인 본문의 카드 틀: <b>{current}개</b>. 저장 뒤 모양이 깨졌다면 카드 틀이 남아 있는
            버전을 불러온 다음 [저장]하세요. 그 사이 넣은 사진·글은 다시 넣어야 합니다.
          </div>

          {busy === "list" && <div className="text-xs">불러오는 중…</div>}

          {data && (
            <ul className="divide-y divide-[var(--color-notion-rule)]">
              {data.fileLayoutBlocks != null && (
                <Row
                  label="처음 올린 모양 (파일 원본)"
                  detail={`카드 틀 ${data.fileLayoutBlocks}개`}
                  busy={busy === "file"}
                  onClick={() => load("file", "처음 올린 모양")}
                />
              )}
              {data.revisions.map((r) => {
                const label = `${formatKST(r.savedAt)} 저장 직전 본문`;
                return (
                  <Row
                    key={r.id}
                    label={label}
                    detail={`카드 틀 ${r.layoutBlocks}개 · ${r.length.toLocaleString()}자`}
                    busy={busy === String(r.id)}
                    onClick={() => load(r.id, label)}
                  />
                );
              })}
              {data.fileLayoutBlocks == null && data.revisions.length === 0 && (
                <li className="py-2 text-xs text-[var(--color-notion-mute)]">
                  아직 저장 기록이 없습니다. 이제부터 저장할 때마다 바로 전 본문이 남습니다.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  detail,
  busy,
  onClick,
}: {
  label: string;
  detail: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="truncate">{label}</div>
        <div className="text-xs text-[var(--color-notion-mute)]">{detail}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="notion-icon-btn text-xs border border-[var(--color-notion-rule)] disabled:opacity-50 shrink-0"
      >
        {busy ? "불러오는 중…" : "불러오기"}
      </button>
    </li>
  );
}
