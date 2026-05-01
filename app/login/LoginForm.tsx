"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({
  next,
  needAdmin,
}: {
  next: string;
  needAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {needAdmin && (
        <div className="text-sm bg-[var(--color-bg-soft)] border border-[var(--color-rule)] rounded-lg p-3 text-[var(--color-ink-soft)]">
          관리실에 들어가려면 관리자 계정으로 로그인하세요.
        </div>
      )}

      <label className="block">
        <span className="kicker text-[var(--color-ink-mute)] mb-1.5 block">
          아이디
        </span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          className="w-full h-12 px-4 rounded-xl border border-[var(--color-rule)] focus:outline-none focus:border-[var(--color-ink)] bg-white text-base"
        />
      </label>

      <label className="block">
        <span className="kicker text-[var(--color-ink-mute)] mb-1.5 block">
          비밀번호
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full h-12 px-4 rounded-xl border border-[var(--color-rule)] focus:outline-none focus:border-[var(--color-ink)] bg-white text-base"
        />
      </label>

      {state.error && (
        <div
          role="alert"
          className="text-sm text-[#c4554d] bg-[#ffe2dd] border border-[#f5c8c0] rounded-lg p-3"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-pill w-full justify-center disabled:opacity-50"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
