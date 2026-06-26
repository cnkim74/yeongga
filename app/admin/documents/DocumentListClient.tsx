"use client";

import { useMemo, useState } from "react";
import { DocumentForm } from "./DocumentForm";
import { deleteDocumentAction } from "./actions";
import type { Document } from "@/lib/documents-db";

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function extLabel(doc: Document): string {
  const m = doc.file_name.match(/\.([A-Za-z0-9]+)$/);
  return (m ? m[1] : "file").toUpperCase();
}

export function DocumentListClient({ documents }: { documents: Document[] }) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .map((d) => d.category)
            .filter((c): c is string => Boolean(c))
        )
      ).sort(),
    [documents]
  );

  // 카테고리별 그룹 (null → "기타"), 카테고리명 정렬, 기타는 맨 뒤
  const groups = useMemo(() => {
    const map = new Map<string, Document[]>();
    for (const d of documents) {
      const key = d.category ?? "기타";
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "기타") return 1;
      if (b === "기타") return -1;
      return a.localeCompare(b, "ko");
    });
  }, [documents]);

  return (
    <div>
      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] mb-8"
        >
          + 새 자료 추가
        </button>
      )}

      {showNew && (
        <div className="mb-8 rounded-xl border border-[var(--color-notion-rule)] p-6 bg-[var(--color-notion-hover)]">
          <h2 className="text-base font-semibold mb-4">새 자료 추가</h2>
          <DocumentForm categories={categories} onDone={() => setShowNew(false)} />
        </div>
      )}

      {documents.length === 0 ? (
        <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
          <div className="text-5xl mb-3">🗂️</div>
          <div className="text-base font-medium mb-1">아직 자료가 없습니다</div>
          <div className="text-sm text-[var(--color-notion-mute)]">
            위의 &quot;새 자료 추가&quot; 버튼을 눌러 첫 자료를 올려 보세요.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([category, docs]) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold text-[var(--color-notion-ink)]">
                  {category}
                </h2>
                <span className="text-xs text-[var(--color-notion-mute)]">
                  {docs.length}
                </span>
              </div>
              <ul className="border border-[var(--color-notion-rule)] rounded-lg divide-y divide-[var(--color-notion-rule)]">
                {docs.map((doc) => (
                  <li key={doc.id}>
                    {editingId === doc.id ? (
                      <div className="p-5 bg-[var(--color-notion-hover)]">
                        <h3 className="text-sm font-semibold mb-4">수정: {doc.title}</h3>
                        <DocumentForm
                          document={doc}
                          categories={categories}
                          onDone={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-notion-hover)] transition">
                        <div className="shrink-0 w-11 h-11 rounded bg-[var(--color-notion-rule)] flex items-center justify-center text-[10px] font-bold text-[var(--color-notion-mute)] font-mono">
                          {extLabel(doc)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{doc.title}</span>
                          {doc.description && (
                            <p className="text-sm text-[var(--color-notion-mute)] truncate">
                              {doc.description}
                            </p>
                          )}
                          <div className="text-xs text-[var(--color-notion-mute)] mt-1 font-mono truncate">
                            {doc.file_name}
                            {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}
                            {` · pos=${doc.position} · ${doc.created_at.slice(0, 10)}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="notion-icon-btn text-xs"
                            title="파일 열기"
                          >
                            열기 ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => setEditingId(doc.id)}
                            className="notion-icon-btn text-xs"
                          >
                            편집
                          </button>
                          <form
                            action={deleteDocumentAction}
                            onSubmit={(e) => {
                              if (
                                !confirm(
                                  `"${doc.title}" 자료를 삭제할까요? 파일도 함께 삭제되며 되돌릴 수 없습니다.`
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={doc.id} />
                            <button
                              type="submit"
                              className="notion-icon-btn text-xs text-[#c4554d] hover:bg-[#ffe2dd]"
                            >
                              삭제
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
