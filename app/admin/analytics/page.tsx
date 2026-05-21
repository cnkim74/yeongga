import { requireAdmin } from "@/lib/auth";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { IconHome, IconSettings } from "@/components/admin/AdminIcons";
import {
  getVisitStats,
  getTopPages,
  getRecentVisits,
  getDailyVisits14d,
} from "@/lib/visits-db";
import {
  isAnalyticsConfigured,
  getVisitorSummary,
  getTopPages as getGaTopPages,
  getEventCounts,
} from "@/lib/ga-analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "방문 기록 — 집무실" };

export default async function AnalyticsPage() {
  await requireAdmin();

  const gaReady = isAnalyticsConfigured();

  const [stats, top7, top30, recent, daily, gaSummary, gaTop, gaEvents] =
    await Promise.all([
      getVisitStats(),
      getTopPages(7, 10),
      getTopPages(30, 10),
      getRecentVisits(50),
      getDailyVisits14d(),
      // GA 데이터 — 환경변수 없으면 null/[] 반환
      gaReady ? getVisitorSummary() : Promise.resolve(null),
      gaReady ? getGaTopPages(10, 28) : Promise.resolve([]),
      gaReady ? getEventCounts(28) : Promise.resolve([]),
    ]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.visits));
  const maxGaDaily = Math.max(
    1,
    ...(gaSummary?.daily.map((d) => d.activeUsers) ?? [1])
  );

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

        {/* ─────────────────────────────────────────────────────────
            Google Analytics 4 — 외부 데이터
            (자체 visits 기록과 별개로, GA 가 수집한 더 풍부한 지표)
            ───────────────────────────────────────────────────────── */}
        <div className="mt-20 mb-10">
          <h2 className="font-serif text-2xl text-[var(--admin-ink)] mb-2">
            Google Analytics
            <span className="font-serif text-xs text-[var(--admin-mute)] ml-3 tracking-widest">
              外部 集計
            </span>
          </h2>
          <p className="text-[var(--admin-ink-soft)] text-sm leading-relaxed max-w-2xl">
            구글 애널리틱스 4 가 수집한 방문 데이터입니다. 자체 방문 기록과
            차이가 있을 수 있습니다 (광고 차단기로 인한 누락 등).
            <br />
            <span className="text-[var(--admin-mute)] text-xs">
              ※ GA 데이터는 보통 24~48 시간 정착 — 오늘 자 수치는 변동될 수 있습니다.
            </span>
          </p>
        </div>

        {!gaReady ? (
          <div className="rounded-lg border border-dashed border-[var(--admin-rule)] bg-[var(--admin-surface)] p-8 text-center">
            <div className="text-3xl mb-3">📊</div>
            <p className="text-sm text-[var(--admin-ink-soft)] mb-2">
              GA 환경변수가 설정되지 않았습니다.
            </p>
            <p className="text-xs text-[var(--admin-mute)] max-w-md mx-auto leading-relaxed">
              Vercel 환경변수에{" "}
              <code className="bg-[var(--admin-bg)] px-1.5 py-0.5 rounded">
                GA_PROPERTY_ID
              </code>
              와{" "}
              <code className="bg-[var(--admin-bg)] px-1.5 py-0.5 rounded">
                GA_SERVICE_ACCOUNT_JSON
              </code>
              을 등록하시면 자동으로 표시됩니다.
            </p>
          </div>
        ) : !gaSummary ? (
          <div className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] p-8 text-center">
            <p className="text-sm text-[var(--admin-ink-soft)]">
              GA 데이터를 불러오지 못했습니다 — 환경변수·서비스 계정 권한을 확인해 주세요.
            </p>
          </div>
        ) : (
          <>
            {/* GA 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              <StatCard
                label="오늘 (GA)"
                value={gaSummary.today.activeUsers}
                sub={`페이지뷰 ${gaSummary.today.pageViews.toLocaleString()}`}
              />
              <StatCard
                label="어제 (GA)"
                value={gaSummary.yesterday.activeUsers}
                sub={`페이지뷰 ${gaSummary.yesterday.pageViews.toLocaleString()}`}
              />
              <StatCard
                label="지난 7일 (GA)"
                value={gaSummary.last7d.activeUsers}
                sub={`페이지뷰 ${gaSummary.last7d.pageViews.toLocaleString()}`}
              />
              <StatCard
                label="지난 28일 (GA)"
                value={gaSummary.last28d.activeUsers}
                sub={`페이지뷰 ${gaSummary.last28d.pageViews.toLocaleString()} · MAU 근사`}
              />
            </div>

            {/* GA 30일 추이 */}
            <Section title="최근 30일 방문 추이 (GA)" hanja="月別">
              {gaSummary.daily.length === 0 ? (
                <Empty>아직 GA 데이터가 없습니다.</Empty>
              ) : (
                <div className="p-5">
                  <div className="flex items-end gap-1 h-40 mb-2">
                    {gaSummary.daily.map((d) => {
                      const h = Math.max(2, (d.activeUsers / maxGaDaily) * 100);
                      return (
                        <div
                          key={d.date}
                          className="flex-1 flex flex-col items-center justify-end relative group"
                          title={`${d.date} · 사용자 ${d.activeUsers}명 / 페이지뷰 ${d.pageViews}회`}
                        >
                          <div
                            className="w-full rounded-t-sm bg-[var(--admin-accent)] opacity-80 group-hover:opacity-100 transition"
                            style={{ height: `${h}%` }}
                          />
                          <div className="absolute -top-5 text-[10px] tabular-nums opacity-0 group-hover:opacity-100 transition text-[var(--admin-ink)]">
                            {d.activeUsers}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1">
                    {gaSummary.daily.map((d, i) => (
                      <div
                        key={d.date}
                        className="flex-1 text-center text-[9px] font-mono text-[var(--admin-mute)]"
                      >
                        {/* 5일 간격으로만 날짜 표시 — 30일 라벨 다 보이면 빽빽 */}
                        {i % 5 === 0 ? d.date.slice(5) : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* 인기 글 TOP 10 (GA 28일) */}
            <Section title="인기 페이지 TOP 10 (GA · 28일)" hanja="人氣">
              {gaTop.length === 0 ? (
                <Empty>데이터가 없습니다.</Empty>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--admin-mute)] border-b border-[var(--admin-rule)]">
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3">경로 / 제목</th>
                      <th className="py-2 px-3 w-20 text-right">페이지뷰</th>
                      <th className="py-2 px-3 w-20 text-right">사용자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaTop.map((r, i) => (
                      <tr
                        key={r.path + i}
                        className="border-b border-[var(--admin-rule-soft)] hover:bg-[var(--admin-bg)]"
                      >
                        <td className="py-2 px-3 text-xs text-[var(--admin-mute)] font-mono tabular-nums">
                          {i + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-mono text-xs truncate max-w-[420px]">
                            {r.path}
                          </div>
                          {r.title && (
                            <div className="text-xs text-[var(--admin-mute)] truncate max-w-[420px] mt-0.5">
                              {r.title}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {r.pageViews.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-[var(--admin-mute)]">
                          {r.activeUsers.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* 이벤트 발생 횟수 (28일) */}
            <Section title="이벤트 발생 횟수 (GA · 28일)" hanja="事象">
              {gaEvents.length === 0 ? (
                <Empty>데이터가 없습니다.</Empty>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--admin-mute)] border-b border-[var(--admin-rule)]">
                      <th className="py-2 px-3">이벤트 이름</th>
                      <th className="py-2 px-3 w-40">분류</th>
                      <th className="py-2 px-3 w-24 text-right">발생 횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaEvents.map((e) => {
                      const meta = EVENT_META[e.name] ?? {
                        label: e.name,
                        category: "기본",
                      };
                      return (
                        <tr
                          key={e.name}
                          className="border-b border-[var(--admin-rule-soft)] hover:bg-[var(--admin-bg)]"
                        >
                          <td className="py-2 px-3">
                            <div className="font-mono text-xs">{e.name}</div>
                            <div className="text-xs text-[var(--admin-ink-soft)] mt-0.5">
                              {meta.label}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs text-[var(--admin-mute)]">
                            {meta.category}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {e.count.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Section>
          </>
        )}
      </div>
    </>
  );
}

/** GA 이벤트 이름 → 한국어 라벨/분류 매핑. 표 표시용. */
const EVENT_META: Record<string, { label: string; category: string }> = {
  // 영가회 커스텀 이벤트
  member_gate_view: { label: "회원 전용 잠금 화면 도달", category: "영가회 · 회원" },
  login_attempt: { label: "로그인 시도", category: "영가회 · 회원" },
  share_click: { label: "공유 버튼 클릭", category: "영가회 · 공유" },
  site_search: { label: "사이트 내 검색", category: "영가회 · 검색" },
  ebook_open: { label: "이북 열기", category: "영가회 · 이북" },
  // GA4 자동 수집
  page_view: { label: "페이지 조회", category: "GA 기본" },
  session_start: { label: "세션 시작", category: "GA 기본" },
  first_visit: { label: "최초 방문", category: "GA 기본" },
  user_engagement: { label: "사용자 참여", category: "GA 기본" },
  scroll: { label: "스크롤 (90%)", category: "GA 향상된 측정" },
  click: { label: "외부 링크 클릭", category: "GA 향상된 측정" },
  file_download: { label: "파일 다운로드", category: "GA 향상된 측정" },
  view_search_results: { label: "검색 결과 보기", category: "GA 향상된 측정" },
  video_start: { label: "동영상 시작", category: "GA 향상된 측정" },
  video_progress: { label: "동영상 진행", category: "GA 향상된 측정" },
  video_complete: { label: "동영상 완료", category: "GA 향상된 측정" },
  form_start: { label: "폼 시작", category: "GA 향상된 측정" },
  form_submit: { label: "폼 제출", category: "GA 향상된 측정" },
};

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
