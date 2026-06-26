import { requireMember } from "@/lib/auth";
import { listDocuments, type Document } from "@/lib/documents-db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "자료실 — 영가회 아카이브",
  description: "영가회 회원 자료실.",
};

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

export default async function DocumentsPage() {
  // 회원·관리자 전용 — 비로그인 시 로그인으로
  await requireMember("/documents");
  const documents = await listDocuments();

  // 카테고리별 그룹 (null → "기타"), "기타"는 맨 뒤
  const map = new Map<string, Document[]>();
  for (const d of documents) {
    const key = d.category ?? "기타";
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  const groups = Array.from(map.entries()).sort(([a], [b]) => {
    if (a === "기타") return 1;
    if (b === "기타") return -1;
    return a.localeCompare(b, "ko");
  });

  return (
    <>
      {/* HERO */}
      <section className="relative pt-40 pb-24 sm:pb-32 overflow-hidden bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-4">회원 전용 · 資料室</div>
          <h1 className="display text-5xl sm:text-7xl mb-6">자료실</h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] leading-relaxed max-w-xl">
            영가회 회의록·서식·자료를 내려받을 수 있습니다.
          </p>
        </div>
      </section>

      {/* 목록 */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-6">
          {documents.length === 0 ? (
            <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
              아직 등록된 자료가 없습니다.
            </div>
          ) : (
            <div className="space-y-12">
              {groups.map(([category, docs]) => (
                <section key={category}>
                  <h2 className="display-md text-xl mb-4 pb-2 border-b border-[var(--color-rule)]">
                    {category}
                    <span className="ml-2 text-sm font-normal text-[var(--color-ink-mute)]">
                      {docs.length}건
                    </span>
                  </h2>
                  <ul className="divide-y divide-[var(--color-rule)]">
                    {docs.map((doc) => (
                      <li key={doc.id}>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.file_name}
                          className="group flex items-center gap-4 py-4 hover:bg-[var(--color-bg-soft)] transition rounded-lg px-2 -mx-2"
                        >
                          <span className="shrink-0 w-12 h-12 rounded-lg bg-[var(--color-bg-soft)] border border-[var(--color-rule)] flex items-center justify-center text-[11px] font-bold text-[var(--color-ink-mute)] font-mono">
                            {extLabel(doc)}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium text-[var(--color-ink)] truncate group-hover:text-[var(--color-accent)] transition">
                              {doc.title}
                            </span>
                            {doc.description && (
                              <span className="block text-sm text-[var(--color-ink-soft)] truncate">
                                {doc.description}
                              </span>
                            )}
                            <span className="block text-xs text-[var(--color-ink-mute)] mt-0.5 truncate">
                              {doc.file_name}
                              {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm text-[var(--color-ink-mute)] group-hover:text-[var(--color-accent)] transition">
                            내려받기 ↓
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
