"use client";

import { useMemo, useState } from "react";
import type { DirectoryMember } from "@/lib/directory-db";

export function MemberList({
  members,
  initials,
}: {
  members: (DirectoryMember & { initial: string })[];
  initials: string[];
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("전체");

  const shown = useMemo(() => {
    const key = q.trim();
    return members.filter((m) => {
      if (tab !== "전체" && m.initial !== tab) return false;
      if (!key) return true;
      return (
        m.name.includes(key) ||
        m.hanja.includes(key) ||
        m.position.includes(key) ||
        m.career.includes(key)
      );
    });
  }, [members, q, tab]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof shown>();
    for (const m of shown) {
      const arr = map.get(m.initial) ?? [];
      arr.push(m);
      map.set(m.initial, arr);
    }
    return [...map.entries()];
  }, [shown]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름, 직장, 직위로 찾기"
          aria-label="회원 찾기"
          className="w-full rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-5 py-4 text-lg outline-none focus:border-[var(--color-ink-soft)]"
        />
        <div className="flex flex-wrap gap-1.5">
          {["전체", ...initials].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`rounded-full border px-4 py-2 text-base transition ${
                tab === t
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-soft)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-sm text-[var(--color-ink-mute)]">
          {shown.length}명
          {(q || tab !== "전체") && ` (전체 ${members.length}명 중)`}
        </p>
      </div>

      {groups.length === 0 && (
        <p className="py-16 text-center text-lg text-[var(--color-ink-mute)]">
          찾는 회원이 없습니다.
        </p>
      )}

      {groups.map(([initial, list]) => (
        <section key={initial} className="mb-10">
          <h2 className="mb-3 border-b-2 border-[var(--color-ink)] pb-2 text-2xl font-semibold">
            {initial}
          </h2>
          <ul>
            {list.map((m) => (
              <li
                key={m.id}
                className="border-b border-[var(--color-rule)] py-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-xl font-semibold text-[var(--color-ink)]">
                    {m.name}
                  </span>
                  {m.hanja && (
                    <span className="text-base text-[var(--color-ink-mute)]">
                      {m.hanja}
                    </span>
                  )}
                </div>
                {m.position && (
                  <p className="mt-1 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                    {m.position}
                  </p>
                )}
                {m.career && (
                  <p className="mt-0.5 text-base leading-relaxed text-[var(--color-ink-mute)]">
                    <span className="mr-1.5 text-sm">경력</span>
                    {m.career}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
