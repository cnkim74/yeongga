"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    signupAction,
    {}
  );

  const googleHref = `/api/auth/google/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="space-y-5">
      <a
        href={googleHref}
        className="flex items-center justify-center gap-3 w-full h-12 px-4 rounded-xl border border-[var(--color-rule)] bg-white hover:bg-[var(--color-bg-soft)] transition-colors text-base font-medium"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google 계정으로 가입
      </a>

      <div className="flex items-center gap-3 text-xs text-[var(--color-ink-mute)]">
        <span className="flex-1 h-px bg-[var(--color-rule)]" />
        또는
        <span className="flex-1 h-px bg-[var(--color-rule)]" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="kicker text-[var(--color-ink-mute)] mb-1.5 block">이름</span>
          <input
            name="name"
            type="text"
            required
            autoFocus
            className="w-full h-12 px-4 rounded-xl border border-[var(--color-rule)] focus:outline-none focus:border-[var(--color-ink)] bg-white text-base"
          />
        </label>

        <label className="block">
          <span className="kicker text-[var(--color-ink-mute)] mb-1.5 block">이메일</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full h-12 px-4 rounded-xl border border-[var(--color-rule)] focus:outline-none focus:border-[var(--color-ink)] bg-white text-base"
          />
        </label>

        <label className="block">
          <span className="kicker text-[var(--color-ink-mute)] mb-1.5 block">비밀번호 (6자 이상)</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full h-12 px-4 rounded-xl border border-[var(--color-rule)] focus:outline-none focus:border-[var(--color-ink)] bg-white text-base"
          />
        </label>

        <label className="block">
          <span className="kicker text-[var(--color-ink-mute)] mb-1.5 block">비밀번호 확인</span>
          <input
            name="password2"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
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
          {pending ? "신청 중…" : "가입 신청"}
        </button>

        <p className="text-xs text-[var(--color-ink-mute)] text-center leading-relaxed">
          가입 신청 후 <b>관리자 승인</b>이 완료되면 로그인할 수 있습니다.
        </p>
      </form>
    </div>
  );
}
