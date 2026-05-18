"use client";

import { useEffect, useState } from "react";

type Phase = "idle" | "copy" | "patch" | "done" | "error";

type StatusRes = {
  ok: boolean;
  total?: number;
  copied_so_far?: number;
  remaining?: number;
  error?: string;
};

type StepRes = {
  ok: boolean;
  phase: "copy" | "patch" | "done";
  total: number;
  copied_so_far: number;
  processed_this_call: number;
  errors_this_call: { blob_url: string; error?: string }[];
  patch_summary?: { table: string; col: string; updated: number; error?: string }[];
  done: boolean;
  error?: string;
};

export function MigrateR2Client() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [total, setTotal] = useState<number | null>(null);
  const [copied, setCopied] = useState(0);
  const [callsMade, setCallsMade] = useState(0);
  const [recentErrors, setRecentErrors] = useState<{ blob_url: string; error?: string }[]>([]);
  const [patchSummary, setPatchSummary] = useState<StepRes["patch_summary"] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // 첫 진입 시 진행 상태 조회
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/migrate-blob-to-r2");
        const json: StatusRes = await res.json();
        if (!res.ok || !json.ok) {
          setErrorMsg(json.error ?? `상태 조회 실패 (HTTP ${res.status})`);
          setStatusLoading(false);
          return;
        }
        setTotal(json.total ?? 0);
        setCopied(json.copied_so_far ?? 0);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
      } finally {
        setStatusLoading(false);
      }
    })();
  }, []);

  async function runOneStep(): Promise<StepRes | null> {
    try {
      const res = await fetch("/api/admin/migrate-blob-to-r2", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      // 응답이 JSON이 아닐 수도 (Vercel function timeout 시 plain text)
      const text = await res.text();
      let json: StepRes | null = null;
      try {
        json = JSON.parse(text) as StepRes;
      } catch {
        // 서버에서 JSON 아닌 응답 (보통 timeout 또는 메모리 초과)
        const snippet = text.slice(0, 120);
        setPhase("error");
        setErrorMsg(
          `서버 응답 파싱 실패 (HTTP ${res.status}). 큰 파일에서 timeout 났을 가능성이 큽니다. ` +
            `잠시 후 〈다시 시도〉를 누르면 이어 작업합니다. — 응답 일부: ${snippet}…`
        );
        return null;
      }
      if (!res.ok || !json.ok) {
        setPhase("error");
        setErrorMsg(json.error ?? `HTTP ${res.status}`);
        return null;
      }
      setTotal(json.total);
      setCopied(json.copied_so_far);
      setCallsMade((n) => n + 1);
      if (json.errors_this_call.length > 0) {
        setRecentErrors(json.errors_this_call);
      }
      if (json.patch_summary) setPatchSummary(json.patch_summary);
      return json;
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async function startMigration() {
    setPhase("copy");
    setErrorMsg(null);
    setPatchSummary(null);
    setCallsMade(0);
    // 끝까지 자동 호출 반복
    while (true) {
      const r = await runOneStep();
      if (!r) return; // 에러 발생, runOneStep 안에서 phase=error 처리됨
      if (r.done) {
        setPhase("done");
        return;
      }
      // copy phase 진행 중
      setPhase(r.phase === "patch" ? "patch" : "copy");
      // 짧은 양보 (UI 갱신)
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const percent = total && total > 0 ? Math.round((copied / total) * 100) : 0;
  const inProgress = phase === "copy" || phase === "patch";

  return (
    <div className="space-y-6">
      {statusLoading && (
        <div className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] p-5 text-sm text-[var(--admin-mute)]">
          현재 상태를 확인하는 중…
        </div>
      )}

      {!statusLoading && total !== null && (
        <div className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] p-5">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm text-[var(--admin-mute)]">진행 상황</span>
            <span className="font-mono text-sm text-[var(--admin-ink)]">
              {copied} / {total}{" "}
              <span className="text-[var(--admin-mute)]">({percent}%)</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--admin-bg)] overflow-hidden">
            <div
              className="h-full bg-[var(--admin-accent)] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          {phase === "copy" && (
            <p className="mt-3 text-xs text-[var(--admin-mute)]">
              파일을 R2로 옮기는 중… (총 호출 {callsMade}회) — 끊지 마시고 이 페이지에 머물러 주세요.
            </p>
          )}
          {phase === "patch" && (
            <p className="mt-3 text-xs text-[var(--admin-mute)]">
              데이터베이스 URL을 갱신하는 중…
            </p>
          )}
          {phase === "done" && (
            <p className="mt-3 text-xs text-emerald-700 font-medium">
              ✓ 마이그레이션 완료. 사이트의 모든 이미지·PDF가 새 R2 도메인을 사용합니다.
            </p>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          오류: {errorMsg}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={startMigration}
          disabled={inProgress || statusLoading}
          className="px-5 py-2.5 rounded-md bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === "idle" && "마이그레이션 시작"}
          {phase === "copy" && "복사 중…"}
          {phase === "patch" && "DB 갱신 중…"}
          {phase === "done" && "다시 실행"}
          {phase === "error" && "다시 시도"}
        </button>
      </div>

      {recentErrors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-medium text-amber-800 mb-2">
            방금 호출에서 {recentErrors.length}건 실패 (계속 진행됨)
          </div>
          <ul className="text-xs text-amber-700 space-y-1 font-mono break-all">
            {recentErrors.slice(0, 5).map((e) => (
              <li key={e.blob_url}>
                {e.blob_url.split("/").pop()} — {e.error}
              </li>
            ))}
            {recentErrors.length > 5 && (
              <li className="opacity-60">…그 외 {recentErrors.length - 5}건</li>
            )}
          </ul>
        </div>
      )}

      {patchSummary && patchSummary.length > 0 && (
        <div className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] p-5">
          <div className="text-sm font-medium text-[var(--admin-ink)] mb-3">
            DB URL 갱신 결과
          </div>
          <ul className="text-xs space-y-1 font-mono">
            {patchSummary.map((s) => (
              <li
                key={`${s.table}-${s.col}`}
                className={s.error ? "text-red-600" : "text-[var(--admin-ink-soft)]"}
              >
                {s.table}.{s.col} — {s.updated}건 갱신{s.error ? ` (오류: ${s.error})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
