import { requireAdmin } from "@/lib/auth";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { IconHome, IconMembers } from "@/components/admin/AdminIcons";
import {
  listSubmissions,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/lib/submissions-db";
import { SubmissionRow } from "./SubmissionRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "자료 접수 — 집무실" };

export default async function AdminSubmissionsPage() {
  await requireAdmin();
  const submissions = await listSubmissions();

  const counts = {
    new: submissions.filter((s) => s.status === "new").length,
    reviewing: submissions.filter((s) => s.status === "reviewing").length,
    done: submissions.filter((s) => s.status === "done").length,
    archived: submissions.filter((s) => s.status === "archived").length,
  };

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin", icon: <IconHome size={14} /> },
          { label: "자료 접수", icon: <IconMembers size={14} /> },
        ]}
      />

      <div className="max-w-[1080px] mx-auto px-10 pt-12 pb-24">
        <div className="mb-10">
          <h1 className="font-serif text-3xl text-[var(--admin-ink)] mb-2">
            자료 접수
            <span className="font-serif text-sm text-[var(--admin-mute)] ml-3 tracking-widest">
              資料受付
            </span>
          </h1>
          <p className="text-[var(--admin-ink-soft)] text-sm leading-relaxed max-w-2xl">
            공개 사이트의 <code className="font-mono text-xs">/contribute</code> 페이지에서
            회원께서 보내 주신 자료가 여기 모입니다. 검토 후 상태를 변경하거나
            보관해 두실 수 있습니다.
          </p>
        </div>

        {/* 상태 요약 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <StatusPill label={STATUS_LABELS.new}       count={counts.new}       tone="accent" />
          <StatusPill label={STATUS_LABELS.reviewing} count={counts.reviewing} tone="amber" />
          <StatusPill label={STATUS_LABELS.done}      count={counts.done}      tone="green" />
          <StatusPill label={STATUS_LABELS.archived}  count={counts.archived}  tone="mute" />
        </div>

        {/* 목록 */}
        {submissions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--admin-rule)] bg-[var(--admin-surface)] p-16 text-center">
            <div className="text-3xl mb-2 select-none">受</div>
            <div className="text-sm font-medium mb-1">아직 접수된 자료가 없습니다</div>
            <div className="text-xs text-[var(--admin-mute)]">
              공개 사이트 푸터의 &quot;자료 제공&quot; 링크로 접수가 시작되면 여기에 표시됩니다.
            </div>
          </div>
        ) : (
          <ul className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] divide-y divide-[var(--admin-rule-soft)] overflow-hidden">
            {submissions.map((s) => (
              <SubmissionRow
                key={s.id}
                submission={s}
                categoryLabel={CATEGORY_LABELS[s.category]}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function StatusPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "accent" | "amber" | "green" | "mute";
}) {
  const toneClass = {
    accent: "bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]",
    amber:  "bg-amber-100 text-amber-800",
    green:  "bg-emerald-100 text-emerald-800",
    mute:   "bg-[var(--admin-bg)] text-[var(--admin-mute)]",
  }[tone];
  return (
    <div className={`rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] p-3 flex items-center justify-between`}>
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${toneClass}`}>
        {label}
      </span>
      <span className="font-serif text-xl tabular-nums text-[var(--admin-ink)]">
        {count}
      </span>
    </div>
  );
}
