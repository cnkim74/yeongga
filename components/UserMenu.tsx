"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import type { SessionUser } from "@/lib/session";

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) {
    return (
      <Link href="/login" className="pill-nav-link" aria-label="로그인">
        로그인
      </Link>
    );
  }

  const initial = user.name.slice(0, 1);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pill-nav-pill"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="h-7 w-7 rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] grid place-items-center text-xs font-bold">
          {initial}
        </span>
        <span className="hidden sm:inline">{user.name}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-56 bg-white rounded-2xl border border-[var(--color-rule)] shadow-lg p-2 text-sm"
        >
          <div className="px-3 py-2">
            <div className="font-semibold text-[var(--color-ink)]">
              {user.name}
            </div>
            <div className="text-xs text-[var(--color-ink-mute)]">
              @{user.username} ·{" "}
              <span
                className={
                  user.role === "admin"
                    ? "text-[var(--color-accent)] font-medium"
                    : ""
                }
              >
                {user.role === "admin" ? "관리자" : "회원"}
              </span>
            </div>
          </div>
          <hr className="my-1 border-[var(--color-rule)]" />
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-soft)] text-[var(--color-ink)]"
              onClick={() => setOpen(false)}
            >
              집무실 들어가기
            </Link>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full text-left block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]"
            >
              로그아웃
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
