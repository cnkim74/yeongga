"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ReadingSizeControl } from "./ReadingSizeControl";
import { UserMenu } from "./UserMenu";
import { Logo } from "./Logo";
import type { SessionUser } from "@/lib/session";
import { chapters } from "@/lib/chapters";

const NAV = [
  { href: "/", label: "표지" },
  { href: "/archive", label: "아카이브", hasDropdown: true },
  { href: "/search", label: "검색" },
  { href: "/videos", label: "영상" },
  { href: "/about", label: "소개" },
  { href: "/gallery", label: "갤러리" },
];

type Theme = "dark" | "light";

// 디폴트는 라이트 — 회보 정체성에 맞춰 차분한 종이 톤.
// 토글 시 헤더 + 본문(html[data-theme]) 모두 같이 전환.
const DEFAULT_THEME: Theme = "light";

function applyHtmlTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "dark") {
    html.setAttribute("data-theme", "dark");
  } else {
    html.removeAttribute("data-theme");
  }
}

export function HeaderClient({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // 첫 마운트 — localStorage 에서 테마 읽기, html 속성 동기화
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("yeongga-header-theme")
        : null;
    const initial: Theme = saved === "light" || saved === "dark" ? saved : DEFAULT_THEME;
    setTheme(initial);
    applyHtmlTheme(initial);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyHtmlTheme(next);
    try {
      window.localStorage.setItem("yeongga-header-theme", next);
    } catch {
      // 사파리 시크릿 등 — 무시
    }
  }

  const isLight = theme === "light";
  // 알약 헤더는 본문 테마와 반대 톤으로 — 라이트 본문엔 어두운 알약, 다크 본문엔 밝은 알약.
  const pillIsLight = !isLight;

  return (
    <>
      <nav
        className={`pill-nav ${pillIsLight ? "theme-light" : ""}`}
        aria-label="주 메뉴"
      >
        <Link
          href="/"
          className={`${pillIsLight ? "text-[var(--color-ink)]" : "text-white"} hover:opacity-90 transition-opacity`}
          aria-label="영가회 아카이브 — 표지"
        >
          {/* 모바일: 로고만 (공간 절약) */}
          <span className="md:hidden">
            <Logo variant="horizontal" size="sm" inverse={pillIsLight} />
          </span>
          {/* 태블릿+: 키운 로고 + 부제 노출 */}
          <span className="hidden md:inline-flex">
            <Logo variant="horizontal" size="md" inverse={pillIsLight} showAnniversary />
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV.map((n) => {
            const active =
              n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            if (n.hasDropdown && n.href === "/archive") {
              return (
                <li key={n.href} className="group relative">
                  <Link
                    href={n.href}
                    className="pill-nav-link"
                    aria-current={active ? "page" : undefined}
                    aria-haspopup="true"
                  >
                    {n.label}
                    <span className="ml-1 text-[10px] opacity-60" aria-hidden="true">▾</span>
                  </Link>
                  {/* 호버 간격을 잇기 위한 투명 패딩 영역 (pt-2) + 드롭다운 */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible focus-within:opacity-100 focus-within:visible transition-opacity duration-150"
                    role="menu"
                  >
                    <div className="archive-dropdown-panel min-w-[220px] rounded-2xl shadow-2xl py-2">
                      <Link
                        href="/archive"
                        className="archive-drop-item archive-drop-all"
                        role="menuitem"
                      >
                        전체 아카이브
                      </Link>
                      <div className="my-1 mx-3 border-t border-white/10" />
                      {chapters.map((c) => (
                        <Link
                          key={c.slug}
                          href={c.comingSoon ? "#" : `/archive/${c.slug}`}
                          className={`archive-drop-item ${c.comingSoon ? "archive-drop-disabled" : ""}`}
                          role="menuitem"
                          aria-disabled={c.comingSoon ? "true" : undefined}
                          onClick={(e) => c.comingSoon && e.preventDefault()}
                        >
                          <span className="font-serif text-white/40 w-5 text-center mr-2">
                            {c.number}
                          </span>
                          <span className="flex-1">{c.title}</span>
                          {c.comingSoon && (
                            <span className="text-[10px] text-white/30 tracking-wider ml-2">
                              準備中
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                </li>
              );
            }
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

          {/* 헤더 테마 토글 — 클라이언트 검토용 */}
          <button
            type="button"
            onClick={toggleTheme}
            className="pill-nav-icon"
            aria-label={isLight ? "어두운 모드로 전환" : "밝은 모드로 전환"}
            title={isLight ? "어두운 모드로 전환" : "밝은 모드로 전환"}
          >
            {isLight ? (
              // 달 — 다크 모드로 전환할 수 있다는 의미
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              // 해 — 라이트 모드로 전환할 수 있다는 의미
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            )}
          </button>

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
        <div className="fixed inset-0 z-40 bg-[var(--color-bg)] pt-24 overflow-auto" role="dialog" aria-label="모바일 메뉴">
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
                  {/* 아카이브 아래로 챕터 8개 인라인 표시 */}
                  {n.href === "/archive" && (
                    <ul className="pl-8 pb-2">
                      {chapters.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={c.comingSoon ? "#" : `/archive/${c.slug}`}
                            className={`block py-2.5 text-base ${
                              c.comingSoon
                                ? "text-[var(--color-ink-mute)] opacity-50 cursor-not-allowed"
                                : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                            }`}
                            onClick={(e) => {
                              if (c.comingSoon) {
                                e.preventDefault();
                                return;
                              }
                              setOpen(false);
                            }}
                          >
                            <span className="font-serif text-[var(--color-ink-mute)] w-6 inline-block">
                              {c.number}
                            </span>
                            {c.title}
                            {c.comingSoon && (
                              <span className="ml-2 text-xs">準備中</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
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
