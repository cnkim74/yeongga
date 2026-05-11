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
  { href: "/search", label: "검색" },
  { href: "/videos", label: "영상" },
  { href: "/about", label: "소개" },
  { href: "/gallery", label: "갤러리" },
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
          {/* 태블릿+: 키운 로고 + 創立 50周年 부제 노출 */}
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
          {/* e-Book 바로가기 — 가로 타원형 (아이콘 + 텍스트) */}
          <Link
            href="/ebooks"
            className="pill-nav-pill hidden sm:inline-flex"
            aria-label="e-Book 서재"
            title="e-Book"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[18px] h-[18px] shrink-0"
              aria-hidden="true"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span>e-Book</span>
          </Link>

          {/* 구분 여백 */}
          <span className="hidden sm:block w-px h-4 bg-white/25 mx-1" aria-hidden="true" />

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
          className="fixed top-[88px] right-3 z-50 bg-[var(--color-bg)] border border-[var(--color-rule)] rounded-2xl shadow-2xl p-4"
          role="dialog"
          aria-label="보기 설정"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-xs font-semibold text-[var(--color-ink)]">
              보기 설정
            </div>
            <button
              type="button"
              onClick={() => setSizeOpen(false)}
              aria-label="닫기"
              className="w-6 h-6 inline-flex items-center justify-center rounded-md text-[var(--color-ink-mute)] hover:bg-[var(--color-bg-soft)]"
            >
              ✕
            </button>
          </div>
          <ReadingSizeControl />
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40 bg-[var(--color-bg)] pt-24" role="dialog" aria-label="모바일 메뉴">
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
            {/* 모바일에서는 e-Book도 메뉴에 포함 */}
            <li>
              <Link
                href="/ebooks"
                className="mobile-sheet-link"
                aria-current={pathname.startsWith("/ebooks") ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                📖 e-Book
              </Link>
            </li>
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
            <div className="text-xs font-semibold text-[var(--color-ink)] mb-3">
              보기 설정
            </div>
            <ReadingSizeControl />
          </div>
        </div>
      )}
    </>
  );
}
