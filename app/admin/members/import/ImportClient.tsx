"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ParsedRow = {
  rowNumber: number;
  raw: Record<string, string>;
  data: {
    name: string;
    username: string;
    email: string | null;
    role: "admin" | "member";
    joined_at: string | null;
    note: string | null;
    password: string | null;
  };
  errors: string[];
};

type CommitResult = {
  ok: boolean;
  created: number;
  failed: number;
  errors: { rowNumber: number; name: string; error: string }[];
};

export function ImportClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setRows(null);
    setCommitResult(null);
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/members/import-parse", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setParseError(data.error ?? "파일 파싱에 실패했습니다.");
        return;
      }
      setRows(data.rows);
    } catch (e) {
      setParseError(String(e));
    } finally {
      setParsing(false);
    }
  }

  async function handleCommit() {
    if (!rows) return;
    if (!confirm(`${validRows.length}명을 회원 명부에 등록하시겠습니까?`)) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/admin/members/import-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data: CommitResult = await res.json();
      setCommitResult(data);
      if (data.ok && data.failed === 0) {
        // 성공 — 잠시 후 회원명부로
        setTimeout(() => router.push("/admin/members"), 1500);
      }
    } catch (e) {
      alert(`등록 실패: ${e}`);
    } finally {
      setCommitting(false);
    }
  }

  const validRows = (rows ?? []).filter((r) => r.errors.length === 0);
  const invalidRows = (rows ?? []).filter((r) => r.errors.length > 0);

  return (
    <div className="space-y-6">
      <div className="border border-[var(--color-notion-rule)] rounded-md p-5 bg-[var(--color-notion-sidebar)]">
        <h2 className="text-base font-semibold mb-2">1. 엑셀 파일 올리기</h2>
        <p className="text-sm text-[var(--color-notion-mute)] mb-3 leading-relaxed">
          첫 줄에 헤더, 둘째 줄부터 회원 데이터. 인식 가능한 칼럼:
          <br />
          <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">
            이름 · 아이디 · 이메일 · 권한 · 가입일 · 비밀번호 · 메모
          </code>
          <br />
          빈 비밀번호 = Google 전용 계정용 무작위 해시. 권한은 비워두면 "회원".
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={parsing || committing}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (f) handleFile(f);
            }}
            className="text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-text)] file:text-white file:cursor-pointer disabled:opacity-50"
          />
          <a
            href="/api/admin/members/template"
            className="notion-icon-btn text-sm border border-[var(--color-notion-rule)]"
          >
            📥 템플릿 다운로드
          </a>
        </div>
        {parsing && (
          <div className="mt-3 text-sm text-[var(--color-notion-accent)]">
            ⏳ 파일 분석 중…
          </div>
        )}
        {parseError && (
          <div className="mt-3 text-sm text-[#c4554d] bg-[#ffe2dd] border border-[#f5c8c0] rounded-md p-3">
            {parseError}
          </div>
        )}
      </div>

      {rows && rows.length === 0 && (
        <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-8 text-center text-[var(--color-notion-mute)]">
          엑셀에 데이터 행이 없습니다.
        </div>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="border border-[var(--color-notion-rule)] rounded-md p-5">
            <h2 className="text-base font-semibold mb-3">
              2. 미리보기 ({rows.length}행)
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4">
              <span>
                <span className="text-[var(--color-notion-mute)]">유효</span>{" "}
                <strong className="text-[#0f7b6c]">{validRows.length}</strong>
              </span>
              <span>
                <span className="text-[var(--color-notion-mute)]">오류</span>{" "}
                <strong
                  className={
                    invalidRows.length > 0 ? "text-[#c4554d]" : ""
                  }
                >
                  {invalidRows.length}
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="notion-table min-w-[900px] text-sm">
                <thead>
                  <tr>
                    <th>행</th>
                    <th>이름</th>
                    <th>아이디</th>
                    <th>이메일</th>
                    <th>권한</th>
                    <th>가입일</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={r.errors.length > 0 ? "bg-[#ffe2dd]/40" : ""}
                    >
                      <td className="font-mono text-xs text-[var(--color-notion-mute)]">
                        {r.rowNumber + 1}
                      </td>
                      <td>{r.data.name || "—"}</td>
                      <td className="font-mono text-xs">
                        {r.data.username || "—"}
                      </td>
                      <td className="font-mono text-xs">
                        {r.data.email || "—"}
                      </td>
                      <td>
                        {r.data.role === "admin" ? (
                          <span className="notion-tag tag-purple">관리자</span>
                        ) : (
                          <span className="notion-tag tag-gray">회원</span>
                        )}
                      </td>
                      <td className="text-xs text-[var(--color-notion-mute)]">
                        {r.data.joined_at ?? "—"}
                      </td>
                      <td>
                        {r.errors.length === 0 ? (
                          <span className="notion-tag tag-green">✓</span>
                        ) : (
                          <span className="text-[#c4554d] text-xs">
                            {r.errors.join(" · ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={handleCommit}
              disabled={committing || validRows.length === 0}
              className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 px-5 h-10"
            >
              {committing
                ? "등록 중…"
                : `유효한 ${validRows.length}명 일괄 등록`}
            </button>
            {invalidRows.length > 0 && (
              <span className="text-xs text-[var(--color-notion-mute)]">
                오류 행은 건너뜁니다. 엑셀 수정 후 다시 올리시려면 위에서
                새로운 파일을 선택하세요.
              </span>
            )}
          </div>
        </>
      )}

      {commitResult && (
        <div className="border border-[var(--color-notion-rule)] rounded-md p-5">
          <h2 className="text-base font-semibold mb-3">3. 결과</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-3">
            <span>
              <span className="text-[var(--color-notion-mute)]">등록 성공</span>{" "}
              <strong className="text-[#0f7b6c]">{commitResult.created}</strong>명
            </span>
            <span>
              <span className="text-[var(--color-notion-mute)]">실패</span>{" "}
              <strong
                className={commitResult.failed > 0 ? "text-[#c4554d]" : ""}
              >
                {commitResult.failed}
              </strong>
              명
            </span>
          </div>
          {commitResult.errors.length > 0 ? (
            <ul className="text-sm text-[#c4554d] space-y-1 list-disc pl-5">
              {commitResult.errors.map((err, i) => (
                <li key={i}>
                  행 {err.rowNumber + 1}: {err.name} — {err.error}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-[var(--color-notion-mute)]">
              잠시 후 회원 명부로 이동합니다…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
