"use client";

import { useActionState } from "react";
import { importDirectory, type ImportState } from "./actions";

export function DirectoryForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<ImportState | null, FormData>(
    importDirectory,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-[var(--admin-mute)]">
        현재 등록: {current}
      </p>

      <div>
        <label className="block text-[11px] text-[var(--admin-mute)] mb-1">
          기준 시점
        </label>
        <input
          name="label"
          defaultValue="2026년 1월 1일"
          className="notion-input text-sm h-9 px-3 w-56"
        />
      </div>

      <div>
        <label className="block text-[11px] text-[var(--admin-mute)] mb-1">
          회원수첩 PDF
        </label>
        <input type="file" name="file" accept="application/pdf" className="text-sm" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="notion-btn text-sm px-4 py-2 disabled:opacity-50"
      >
        {pending ? "읽는 중…" : "올리고 명단 교체"}
      </button>

      {state && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <p>{state.message}</p>
          {state.sample && (
            <ul className="mt-2 space-y-0.5 text-xs opacity-80">
              {state.sample.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
