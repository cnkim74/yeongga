"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ReadingSizeControl } from "./ReadingSizeControl";
import { UserMenu } from "./UserMenu";
import { Logo } from "./Logo";
import type { SessionUser } from "@/lib/session";

const NAV = [
  { href: "/", label: "표지" },
  { href: "/archive", label: "아카이브" },
  { href: "/videos", label: "영상" },
  { href: "/about", label: "소개" },
];

export function HeaderClient({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className="pill-nav" aria-label="주 메뉴">
        <Link
          href="/"
          className="text-white hover:opacity-90 transition-opacity"
          aria-label="영가회 아카이브 — 표지"
        >
          {/* 모바일: 로고만 (공간 절약) */}
          <span className="md:hidden">
            <Logo variant="horizontal" size="sm" />
          </span>
          {/* 태블릿+: 키운 로고 + 創立 45周年 부제 노출 */}
          <span className="hidden md:inline-flex">
            <Logo variant="horizontal" size="md" showAnniversary />
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV.map((n) => {
            const active =
              n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="pill-nav-link"
                  aria-current={active ? "page" : undefined}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSizeOpen((v) => !v)}
            className="pill-nav-icon"
            aria-label="글자 크기 조절"
            aria-expanded={sizeOpen}
          >
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 16 }}>가</span>
            <span
              style={{ fontFamily: "var(--font-serif)", fontSize: 12 }}
              className="-ml-0.5 mt-1"
            >
              가
            </span>
          </button>
          <UserMenu user={user} />
          <button
            type="button"
            className="pill-nav-icon md:hidden"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <span aria-hidden="true">✕</span> : <span aria-hidden="true" className="text-xl leading-none">≡</span>}
          </button>
        </div>
      </nav>

      {sizeOpen && (
        <div
          className="fixed top-[76px] right-3 z-50 bg-white border border-[var(--color-rule)] rounded-2xl shadow-lg p-3"
          role="dialog"
          aria-label="글자 크기"
        >
          <div className="text-xs font-semibold text-[var(--color-ink-mute)] mb-2 px-2">
            본문 글자 크기
          </div>
          <ReadingSizeControl />
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40 bg-white pt-24" role="dialog" aria-label="모바일 메뉴">
          <ul>
            {NAV.map((n) => {
              const active =
                n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="mobile-sheet-link"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
            {!user && (
              <li>
                <Link
                  href="/login"
                  className="mobile-sheet-link"
                  onClick={() => setOpen(false)}
                >
                  로그인
                </Link>
              </li>
            )}
          </ul>
          <div className="px-6 mt-8">
            <div className="text-xs font-semibold text-[var(--color-ink-mute)] mb-3">
              본문 글자 크기
            </div>
            <ReadingSizeControl />
          </div>
        </div>
      )}
    </>
  );
}
