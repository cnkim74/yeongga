"use client";

import { useState, useTransition } from "react";
import {
  updateSubmissionAction,
  deleteSubmissionAction,
} from "./actions";
import type { Submission, SubmissionStatus } from "@/lib/submissions-types";
import { STATUS_LABELS, ATTRIBUTION_LABELS } from "@/lib/submissions-types";

const STATUS_OPTIONS: { value: SubmissionStatus; label: string }[] = [
  { value: "new", label: STATUS_LABELS.new },
  { value: "reviewing", label: STATUS_LABELS.reviewing },
  { value: "done", label: STATUS_LABELS.done },
  { value: "archived", label: STATUS_LABELS.archived },
];

const TONE: Record<SubmissionStatus, string> = {
  new: "bg-[var(--admin-accent-soft)] text-[var(--admin-accent)] border-[var(--admin-accent-soft)]",
  reviewing: "bg-amber-100 text-amber-800 border-amber-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  archived: "bg-[var(--admin-bg)] text-[var(--admin-mute)] border-[var(--admin-rule)]",
};

export function SubmissionRow({
  submission: s,
  categoryLabel,
}: {
  submission: Submission;
  categoryLabel: string;
}) {
  const [expanded, setExpanded] = useState(s.status === "new");
  const [status, setStatus] = useState<SubmissionStatus>(s.status);
  const [adminNote, setAdminNote] = useState(s.admin_note ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: SubmissionStatus) {
    setStatus(newStatus);
    const fd = new FormData();
    fd.set("id", String(s.id));
    fd.set("status", newStatus);
    startTransition(async () => {
      await updateSubmissionAction(fd);
      setSavedAt(Date.now());
    });
  }

  function handleNoteSave() {
    const fd = new FormData();
    fd.set("id", String(s.id));
    fd.set("status", status);
    fd.set("admin_note", adminNote);
    startTransition(async () => {
      await updateSubmissionAction(fd);
      setSavedAt(Date.now());
    });
  }

  return (
    <li className="bg-[var(--admin-surface)]">
      {/* 헤더 — 항상 표시 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--admin-bg)] transition"
        aria-expanded={expanded}
      >
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${TONE[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
        <span className="shrink-0 text-xs text-[var(--admin-mute)] font-mono tracking-widest">
          {categoryLabel}
        </span>
        <span className="font-medium text-[var(--admin-ink)] truncate">
          {s.name}
        </span>
        <span className="text-sm text-[var(--admin-ink-soft)] truncate min-w-0 flex-1">
          {s.message.replace(/\s+/g, " ").slice(0, 80)}
        </span>
        <span className="shrink-0 text-xs text-[var(--admin-mute)] font-mono tabular-nums">
          {formatDate(s.created_at)}
        </span>
        <span className="shrink-0 text-[var(--admin-mute)] text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* 펼침 패널 */}
      {expanded && (
        <div className="px-5 pt-4 pb-5 border-t border-[var(--admin-rule-soft)] bg-[var(--admin-bg)]">
          <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
            <Info label="보낸이">{s.name}</Info>
            <Info label="이메일">
              {s.email ? (
                <a
                  href={`mailto:${s.email}`}
                  className="text-[var(--admin-accent)] underline underline-offset-2 hover:opacity-80"
                >
                  {s.email}
                </a>
              ) : (
                <span className="text-[var(--admin-mute)]">—</span>
              )}
            </Info>
            <Info label="연락처">
              {s.phone ?? <span className="text-[var(--admin-mute)]">—</span>}
            </Info>
          </div>

          {/* 본문 */}
          <div className="mb-4">
            <div className="text-[11px] text-[var(--admin-mute)] tracking-widest uppercase mb-1.5">
              내용
            </div>
            <div className="rounded-md bg-[var(--admin-surface)] border border-[var(--admin-rule)] p-4 text-sm whitespace-pre-wrap leading-relaxed">
              {s.message}
            </div>
          </div>

          {/* 동의·출처 정보 */}
          <div className="mb-4 rounded-md bg-[var(--admin-surface)] border border-[var(--admin-rule)] p-4">
            <div className="text-[11px] text-[var(--admin-mute)] tracking-widest uppercase mb-2">
              저작권 동의·출처
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[var(--admin-mute)] mb-0.5">자료 사용 동의</div>
                <div className="text-[var(--admin-ink)] font-medium">
                  {s.consent_at ? (
                    <>✓ 동의 <span className="text-[var(--admin-mute)] ml-1 font-mono">{formatDateShort(s.consent_at)}</span></>
                  ) : (
                    <span className="text-[var(--admin-mute)]">— 기록 없음</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[var(--admin-mute)] mb-0.5">출처 표기</div>
                <div className="text-[var(--admin-ink)] font-medium">
                  {ATTRIBUTION_LABELS[s.attribution_mode]}
                </div>
              </div>
              <div>
                <div className="text-[var(--admin-mute)] mb-0.5">함께 담긴 분 동의</div>
                <div className={s.others_consent ? "text-emerald-700 font-medium" : "text-[var(--admin-mute)]"}>
                  {s.others_consent ? "✓ 확인됨" : "— 해당 없음/미확인"}
                </div>
              </div>
            </div>
          </div>

          {/* 첨부 */}
          {s.file_url && (
            <div className="mb-4">
              <div className="text-[11px] text-[var(--admin-mute)] tracking-widest uppercase mb-1.5">
                첨부
              </div>
              <a
                href={s.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--admin-accent)] underline underline-offset-2 hover:opacity-80"
              >
                📎 {s.file_name ?? "파일 보기"} ↗
              </a>
            </div>
          )}

          {/* 상태 변경 */}
          <div className="mb-4">
            <div className="text-[11px] text-[var(--admin-mute)] tracking-widest uppercase mb-1.5">
              상태
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={isPending}
                  className={`px-3 py-1 rounded-md text-xs font-medium border transition ${
                    status === opt.value
                      ? TONE[opt.value]
                      : "border-[var(--admin-rule)] text-[var(--admin-ink-soft)] hover:bg-[var(--admin-hover)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 관리자 메모 */}
          <div className="mb-4">
            <div className="text-[11px] text-[var(--admin-mute)] tracking-widest uppercase mb-1.5">
              관리자 메모
            </div>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={2}
              placeholder="내부 메모 (회원에겐 보이지 않음)"
              className="w-full text-sm border border-[var(--admin-rule)] rounded-md px-3 py-2 bg-[var(--admin-surface)] focus:outline-none focus:border-[var(--admin-accent)]"
            />
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleNoteSave}
                disabled={isPending}
                className="text-xs px-3 py-1 rounded border border-[var(--admin-rule)] hover:bg-[var(--admin-hover)]"
              >
                메모 저장
              </button>
              {savedAt && Date.now() - savedAt < 3000 && (
                <span className="text-xs text-emerald-600">✓ 저장됨</span>
              )}
            </div>
          </div>

          {/* 삭제 */}
          <form
            action={deleteSubmissionAction}
            onSubmit={(e) => {
              if (!confirm(`"${s.name}" 님의 접수를 삭제할까요? 되돌릴 수 없습니다.`)) {
                e.preventDefault();
              }
            }}
            className="flex justify-end pt-2 border-t border-[var(--admin-rule-soft)]"
          >
            <input type="hidden" name="id" value={s.id} />
            <button
              type="submit"
              className="text-xs px-3 py-1 rounded border border-[var(--admin-rule)] text-red-600 hover:bg-red-50"
            >
              영구 삭제
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--admin-mute)] tracking-widest uppercase mb-1">
        {label}
      </div>
      <div className="text-sm text-[var(--admin-ink)] truncate">{children}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "Z");
  if (isNaN(d.getTime())) return iso;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

/** consent_at 같은 ISO 시각을 짧게 (YY/MM/DD HH:MM) */
function formatDateShort(iso: string): string {
  // consent_at 은 ISO 8601 (toISOString) 또는 SQLite datetime 둘 다 대응
  const isoWithZ = iso.includes("T") ? iso : iso + "Z";
  const d = new Date(isoWithZ);
  if (isNaN(d.getTime())) return iso;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yy = String(kst.getUTCFullYear()).slice(2);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}
