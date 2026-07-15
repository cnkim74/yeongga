"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Result = {
  chapter: string;
  chapterTitle: string;
  slug: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  date: string;
  membersOnly: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function LiveSearch({ examples = [] }: { examples?: string[] }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const query = q.trim();

  // 입력할 때마다 디바운스(300ms) 후 검색 — 구글 자동완성처럼.
  useEffect(() => {
    if (query.length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ac.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setSearched(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults([]);
          setSearched(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query]);

  return (
    <div>
      {/* ── 큰 검색창 ── */}
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--color-ink-mute)]"
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색어를 입력하세요"
          aria-label="검색"
          autoComplete="off"
          className="w-full rounded-full border-2 border-[var(--color-rule)] bg-white py-4 pl-14 pr-14 text-lg shadow-sm transition focus:border-[var(--color-ink)] focus:outline-none sm:py-6 sm:pl-16 sm:pr-16 sm:text-2xl"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            aria-label="지우기"
            className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-ink-mute)] transition hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-ink)]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {/* ── 예시 검색어 (검색 전에만) ── */}
      {query.length < 2 && examples.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-base">
          <span className="text-[var(--color-ink-mute)]">예시:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQ(ex);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-[var(--color-rule)] px-4 py-1.5 text-[var(--color-ink-soft)] transition hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* ── 결과 ── */}
      {query.length >= 2 && (
        <div className="mt-8">
          {loading && results.length === 0 ? (
            <p className="py-10 text-center text-lg text-[var(--color-ink-mute)]">
              검색하는 중…
            </p>
          ) : searched && results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-rule)] p-14 text-center text-lg text-[var(--color-ink-mute)]">
              <span className="font-semibold text-[var(--color-ink-soft)]">
                “{query}”
              </span>
              에 대한 결과가 없습니다.
              <br />
              <span className="text-base">다른 낱말로 다시 찾아 보세요.</span>
            </div>
          ) : (
            <>
              <div className="mb-3 text-base text-[var(--color-ink-mute)]">
                검색 결과{" "}
                <span className="font-semibold text-[var(--color-ink)]">
                  {results.length}
                </span>
                편
              </div>
              <ul className="divide-y divide-[var(--color-rule)] border-t border-b border-[var(--color-rule)]">
                {results.map((a) => (
                  <li key={`${a.chapter}/${a.slug}`}>
                    <Link
                      href={`/archive/${a.chapter}/${a.slug}`}
                      className="group flex items-baseline justify-between gap-6 px-2 py-5 transition hover:bg-[var(--color-bg-soft)]"
                    >
                      <div>
                        <div className="mb-1 text-sm text-[var(--color-ink-mute)]">
                          {a.chapterTitle}
                        </div>
                        <h3 className="display-md text-xl transition group-hover:text-[var(--color-accent)] sm:text-2xl">
                          {a.membersOnly && (
                            <span className="mr-2 align-middle text-xs text-[var(--color-ink-mute)]">
                              🔒
                            </span>
                          )}
                          {a.title}
                        </h3>
                        {a.excerpt && (
                          <p className="mt-1 line-clamp-1 text-base text-[var(--color-ink-soft)]">
                            {a.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-sm text-[var(--color-ink-mute)]">
                        <div className="font-mono tabular-nums">
                          {formatDate(a.date)}
                        </div>
                        {a.author && <div className="mt-0.5">{a.author}</div>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
