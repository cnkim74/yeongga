import { requireAdmin } from "@/lib/auth";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { IconHome, IconSettings } from "@/components/admin/AdminIcons";
import { getDb } from "@/lib/db";
import { ReseedChapterButton } from "./ReseedChapterButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "진단 — 집무실" };

export default async function DiagnosticsPage() {
  await requireAdmin();
  const db = await getDb();

  // 1) 챕터별 글 개수
  const chapterCounts = await db.execute(
    `SELECT chapter, COUNT(*) as n FROM articles GROUP BY chapter ORDER BY chapter`
  );

  // 2) seeded_deletions 목록
  const deletions = await db.execute(
    `SELECT chapter, slug FROM seeded_deletions ORDER BY chapter, slug`
  );

  // 3) migrations_log 목록
  const migrations = await db.execute(
    `SELECT key, run_at FROM migrations_log ORDER BY run_at DESC`
  );

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin", icon: <IconHome size={14} /> },
          { label: "진단", icon: <IconSettings size={14} /> },
        ]}
      />

      <div className="max-w-[960px] mx-auto px-10 pt-12 pb-24">
        <h1 className="font-serif text-3xl text-[var(--admin-ink)] mb-8">
          진단
          <span className="font-serif text-sm text-[var(--admin-mute)] ml-3 tracking-widest">
            診斷
          </span>
        </h1>

        <Section title="챕터별 글 개수" hanja="章別">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--admin-mute)]">
                <th className="py-2 px-3">챕터</th>
                <th className="py-2 px-3 text-right">개수</th>
                <th className="py-2 px-3 w-48">조치</th>
              </tr>
            </thead>
            <tbody>
              {chapterCounts.rows.map((row, i) => (
                <tr key={i} className="border-t border-[var(--admin-rule-soft)]">
                  <td className="py-2 px-3 font-mono">{String(row.chapter)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {String(row.n)}
                  </td>
                  <td className="py-2 px-3" />
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 p-3 border-t border-[var(--admin-rule)] bg-[var(--admin-bg)]">
            <div className="text-xs text-[var(--admin-ink-soft)] mb-2">
              자취(jachui) 챕터를 콘텐츠 디렉토리에서 강제 재시드:
              <br />
              <span className="text-[var(--admin-mute)]">
                (seeded_deletions 무시하고 누락 글을 다시 등록합니다)
              </span>
            </div>
            <ReseedChapterButton chapter="jachui" />
          </div>
        </Section>

        <Section title="삭제 차단 목록" hanja="削除記錄">
          {deletions.rows.length === 0 ? (
            <div className="text-sm text-[var(--admin-mute)] py-4">
              비어 있습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--admin-mute)]">
                  <th className="py-2 px-3">챕터</th>
                  <th className="py-2 px-3">슬러그</th>
                </tr>
              </thead>
              <tbody>
                {deletions.rows.map((row, i) => (
                  <tr key={i} className="border-t border-[var(--admin-rule-soft)] font-mono text-xs">
                    <td className="py-2 px-3">{String(row.chapter)}</td>
                    <td className="py-2 px-3">{String(row.slug)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-1 text-[11px] text-[var(--admin-mute)] px-3">
            여기에 등록된 (챕터·슬러그) 조합은 시드 시 자동으로 건너뜁니다.
            잘못 등록된 경우 위의 &quot;강제 재시드&quot; 버튼을 사용하세요.
          </div>
        </Section>

        <Section title="마이그레이션 이력" hanja="移行履歷">
          {migrations.rows.length === 0 ? (
            <div className="text-sm text-[var(--admin-mute)] py-4">
              비어 있습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--admin-mute)]">
                  <th className="py-2 px-3">키</th>
                  <th className="py-2 px-3">실행 시각</th>
                </tr>
              </thead>
              <tbody>
                {migrations.rows.map((row, i) => (
                  <tr key={i} className="border-t border-[var(--admin-rule-soft)] font-mono text-xs">
                    <td className="py-2 px-3">{String(row.key)}</td>
                    <td className="py-2 px-3 text-[var(--admin-mute)]">
                      {String(row.run_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  hanja,
  children,
}: {
  title: string;
  hanja: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-serif text-xl text-[var(--admin-ink)]">{title}</h2>
        <span className="font-serif text-sm text-[var(--admin-mute)] tracking-widest">
          {hanja}
        </span>
        <div className="flex-1 border-t border-[var(--admin-rule)] mt-2.5" />
      </div>
      <div className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
