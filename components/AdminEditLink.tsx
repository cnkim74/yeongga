"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * 관리자에게만 보이는 편집 링크.
 * 서버 컴포넌트에서 getCurrentUser()를 호출하지 않아도 되도록
 * 클라이언트에서 /api/me 를 조회해 관리자 여부를 확인한다.
 */
export function AdminEditLink({
  href,
  label = "편집",
  className,
}: {
  href: string;
  label?: string;
  /** 커버 이미지 유무 등 상위 컴포넌트에서 스타일 주입 */
  className?: string;
}) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(Boolean(d?.isAdmin)))
      .catch(() => {});
  }, []);

  if (!isAdmin) return null;

  const defaultClass =
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium " +
    "border border-[var(--color-rule)] text-[var(--color-ink-mute)] " +
    "hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-ink)] transition";

  return (
    <Link href={href} className={className ?? defaultClass}>
      ✏️ {label}
    </Link>
  );
}
