import { requireAdmin } from "@/lib/auth";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { IconHome, IconSettings } from "@/components/admin/AdminIcons";
import {
  getVisitStats,
  getTopPages,
  getRecentVisits,
  getDailyVisits14d,
} from "@/lib/visits-db";

export const dynamic = "force-dynamic";
export const metadata = { title: "방문 기록 — 집무실" };

export default async function AnalyticsPage() {
  await requireAdmin();

  const [stats, top7, top30, recent, daily] = await Promise.all([
    getVisitStats(),
    getTopPages(7, 10),
    getTopPages(30, 10),
    getRecentVisits(50),
    getDailyVisits14d(),
  ]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.visits));

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin", icon: <IconHome size={14} /> },
          { label: "방문 기록", icon: <IconSettings size={14} /> },
        ]}
      />

      <div className="max-w-[1080px] mx-auto px-10 pt-12 pb-24">
        <div className="mb-10">
          <h1 className="font-serif text-3xl text-[var(--admin-ink)] mb-2">
            방문 기록
            <span className="font-serif text-sm text-[var(--admin-mute)] ml-3 tracking-widest">
              訪問記錄
            </span>
          </h1>
          <p className="text-[var(--admin-ink-soft)] text-sm leading-relaxed max-w-2xl">
            공개 사이트에 들어온 방문 기록입니다. 봇·관리자 경로는 제외됩니다.
            <br />
            <span className="text-[var(--admin-mute)] text-xs">
              개인정보 보호: IP 와 브라우저 정보는 해시(SHA-256)로 익명화되어 저장됩니다.
            </span>
          </p>
        </div>

        {/* ── 요약 카드 ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          <StatCard label="오늘" value={stats.today} sub={`고유 ${stats.uniqueToday}명`} />
          <StatCard label="지난 7일" value={stats.thisWeek} sub={`고유 ${stats.uniqueWeek}명`} />
          <StatCard label="지난 30일" value={stats.thisMonth} sub="누적 방문" />
          <StatCard label="전체" value={stats.total} sub="누적 30일 보존" />
          <StatCard label="고유(오늘)" value={stats.uniqueToday} sub="브라우저 기준" />
          <StatCard label="고유(7일)" value={stats.uniqueWeek} sub="브라우저 기준" />
        </div>

        {/* ── 14일 추이 — 막대 차트 ── */}
        <Section title="최근 14일 방문 추이" hanja="日別">
          {daily.length === 0 ? (
            <Empty>아직 방문 기록이 없습니다.</Empty>
          ) : (
            <div className="p-5">
              <div className="flex items-end gap-1.5 h-40 mb-2">
                {daily.map((d) => {
                  const h = Math.max(2, (d.visits / maxDaily) * 100);
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center justify-end relative group"
                      title={`${d.day} · ${d.visits}회 / 고유 ${d.uniques}명`}
                    >
                      <div
                        className="w-full rounded-t-sm bg-[var(--admin-accent)] opacity-80 group-hover:opacity-100 transition"
                        style={{ height: `${h}%` }}
                      />
                      <div className="absolute -top-5 text-[10px] tabular-nums opacity-0 group-hover:opacity-100 transition text-[var(--admin-ink)]">
                        {d.visits}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                {daily.map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 text-center text-[9px] font-mono text-[var(--admin-mute)]"
                  >
                    {d.day.slice(5)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ── 인기 페이지 ── */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          <Section title="인기 페이지 (7일)" hanja="週間">
            <TopPagesTable rows={top7} />
          </Section>
          <Section title="인기 페이지 (30일)" hanja="月間">
            <TopPagesTable rows={top30} />
          </Section>
        </div>

        {/* ── 최근 방문 ── */}
        <Section title="최근 방문 50건" hanja="最近">
          {recent.length === 0 ? (
            <Empty>아직 방문 기록이 없습니다.</Empty>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--admin-surface)]">
                  <tr className="text-left text-xs text-[var(--admin-mute)] border-b border-[var(--admin-rule)]">
                    <th className="py-2 px-3 w-40">시각</th>
                    <th className="py-2 px-3">경로</th>
                    <th className="py-2 px-3 w-24">방문자</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((v) => (
                    <tr key={v.id} className="border-b border-[var(--admin-rule-soft)] hover:bg-[var(--admin-bg)]">
                      <td className="py-1.5 px-3 font-mono text-[11px] text-[var(--admin-ink-soft)]">
                        {formatVisitedAt(v.visited_at)}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-xs truncate max-w-md">
                        {v.path}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-[10px] text-[var(--admin-mute)]">
                        {v.visitor_id?.slice(0, 8) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

function Section({ title, hanja, children }: {
  title: string; hanja: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-serif text-lg text-[var(--admin-ink)]">{title}</h2>
        <span className="font-serif text-xs text-[var(--admin-mute)] tracking-widest">
          {hanja}
        </span>
        <div className="flex-1 border-t border-[var(--admin-rule)] mt-2" />
      </div>
      <div className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: {
  label: string; value: number; sub: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] p-3">
      <div className="text-[10px] text-[var(--admin-mute)] tracking-widest uppercase">
        {label}
      </div>
      <div className="font-serif text-2xl text-[var(--admin-ink)] tabular-nums mt-1">
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-[var(--admin-mute)] mt-0.5 truncate">
        {sub}
      </div>
    </div>
  );
}

function TopPagesTable({ rows }: { rows: { path: string; visits: number; uniques: number }[] }) {
  if (rows.length === 0) return <Empty>데이터가 없습니다.</Empty>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-[var(--admin-mute)] border-b border-[var(--admin-rule)]">
          <th className="py-2 px-3">경로</th>
          <th className="py-2 px-3 w-16 text-right">방문</th>
          <th className="py-2 px-3 w-16 text-right">고유</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-[var(--admin-rule-soft)] hover:bg-[var(--admin-bg)]">
            <td className="py-1.5 px-3 font-mono text-xs truncate max-w-[200px]">{r.path}</td>
            <td className="py-1.5 px-3 text-right tabular-nums">{r.visits}</td>
            <td className="py-1.5 px-3 text-right tabular-nums text-[var(--admin-mute)]">
              {r.uniques}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center text-sm text-[var(--admin-mute)]">
      {children}
    </div>
  );
}

function formatVisitedAt(iso: string): string {
  // SQLite 의 datetime() 결과: "YYYY-MM-DD HH:MM:SS" (UTC)
  // KST(+9)로 변환 표시
  const d = new Date(iso + "Z");
  if (isNaN(d.getTime())) return iso;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}
