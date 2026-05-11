"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "../Logo";
import {
  IconHome,
  IconSlides,
  IconVideo,
  IconArticle,
  IconGallery,
  IconEbook,
  IconMembers,
  IconTag,
  IconBackground,
  IconSettings,
  IconExternal,
} from "./AdminIcons";

type NavItem = {
  href: string;
  label: string;
  Icon: (p: { size?: number; className?: string }) => React.JSX.Element;
};

type NavGroup = {
  section: string;
  hanja?: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    section: "집무",
    hanja: "執務",
    items: [{ href: "/admin", label: "집무실 홈", Icon: IconHome }],
  },
  {
    section: "콘텐츠",
    hanja: "編輯",
    items: [
      { href: "/admin/slides",   label: "홈 슬라이드", Icon: IconSlides },
      { href: "/admin/chapters", label: "챕터 표지",   Icon: IconBackground },
      { href: "/admin/videos",   label: "동영상",       Icon: IconVideo },
      { href: "/admin/articles", label: "글 관리",      Icon: IconArticle },
      { href: "/admin/gallery",  label: "사진 갤러리",   Icon: IconGallery },
      { href: "/admin/ebooks",   label: "이북",         Icon: IconEbook },
    ],
  },
  {
    section: "사람",
    hanja: "會員",
    items: [
      { href: "/admin/members", label: "회원 명부", Icon: IconMembers },
      { href: "/admin/banners", label: "회원 배너", Icon: IconTag },
    ],
  },
  {
    section: "환경",
    hanja: "設定",
    items: [
      { href: "/admin/tags",        label: "키워드 태그", Icon: IconTag },
      { href: "/admin/backgrounds", label: "페이지 배경", Icon: IconBackground },
      { href: "/admin/settings",    label: "시스템 설정", Icon: IconSettings },
      { href: "/admin/diagnostics", label: "진단",       Icon: IconSettings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar w-[260px] shrink-0 hidden md:flex flex-col h-screen sticky top-0">
      {/* ── 상단 브랜드 ── */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--admin-rule)]">
        <div className="flex items-center gap-3">
          <LogoMark size={36} inverse className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-serif text-base leading-tight tracking-tight text-[var(--admin-ink)]">
              영가회 집무실
            </div>
            <div className="text-[10px] mt-0.5 text-[var(--admin-mute)] tracking-[0.25em] font-medium">
              YEONGGA · 執務室
            </div>
          </div>
        </div>
      </div>

      {/* ── 네비게이션 ── */}
      <nav className="flex-1 overflow-auto py-4 px-3">
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            <div className="admin-side-section">
              <span>{group.section}</span>
              {group.hanja && (
                <span className="font-serif text-[10px] tracking-widest opacity-50 ml-2">
                  {group.hanja}
                </span>
              )}
            </div>

            <ul className="mt-1">
              {group.items.map((it) => {
                const active =
                  it.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(it.href);
                const Icon = it.Icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="admin-side-link group"
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="admin-side-icon">
                        <Icon size={17} />
                      </span>
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── 하단 외부 이동 ── */}
      <div className="px-3 pb-3 pt-2 border-t border-[var(--admin-rule)]">
        <Link href="/" className="admin-side-link admin-side-foot">
          <span className="admin-side-icon">
            <IconExternal size={17} />
          </span>
          <span>공개 사이트로 이동</span>
        </Link>
        <div className="mt-3 px-2 text-[10px] text-[var(--admin-mute)] tracking-wide font-mono">
          v0.1 · 사내 운영용
        </div>
      </div>
    </aside>
  );
}
