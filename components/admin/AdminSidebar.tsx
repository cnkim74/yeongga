"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "../Logo";

const NAV: { section: string; items: { href: string; icon: string; label: string }[] }[] = [
  {
    section: "WORKSPACE",
    items: [{ href: "/admin", icon: "🏠", label: "관리실 홈" }],
  },
  {
    section: "공개 콘텐츠",
    items: [
      { href: "/admin/slides", icon: "🖼️", label: "홈 슬라이드" },
      { href: "/admin/videos", icon: "🎞️", label: "동영상" },
      { href: "/admin/articles", icon: "📝", label: "글 관리" },
      { href: "/admin/photos", icon: "📸", label: "사진 아카이브" },
    ],
  },
  {
    section: "사람",
    items: [{ href: "/admin/members", icon: "👥", label: "회원 명부" }],
  },
  {
    section: "기타",
    items: [
      { href: "/admin/settings", icon: "⚙️", label: "설정" },
      { href: "/", icon: "↗", label: "공개 사이트로 이동" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="notion-sidebar w-[260px] shrink-0 hidden md:flex flex-col h-screen sticky top-0">
      <div className="px-3 py-3 flex items-center gap-2.5 border-b border-[var(--color-notion-rule)]">
        <LogoMark size={32} inverse className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">영가회 관리실</div>
          <div className="text-[10px] text-[var(--color-notion-mute)] truncate font-mono uppercase tracking-wider">
            YEONGGA · ADMIN
          </div>
        </div>
      </div>

      <div className="px-2 py-3 flex-1 overflow-auto">
        {NAV.map((group) => (
          <div key={group.section} className="mb-4">
            <div className="notion-side-section">{group.section}</div>
            <ul>
              {group.items.map((it) => {
                const active =
                  it.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="notion-side-link"
                      aria-current={active ? "page" : undefined}
                    >
                      <span aria-hidden="true" className="w-5 text-center">
                        {it.icon}
                      </span>
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-[var(--color-notion-rule)] text-xs text-[var(--color-notion-mute)]">
        v0.1 · 사내 운영용
      </div>
    </aside>
  );
}
