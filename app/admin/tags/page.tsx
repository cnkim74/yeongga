import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { listAllTags } from "@/lib/tags-db";
import { TagRow } from "./TagRow";

export const dynamic = "force-dynamic";

export const metadata = { title: "키워드 관리 — 집무실" };

export default async function TagsAdminPage() {
  const tags = await listAllTags();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "🏷️ 키워드" },
        ]}
      />
      <div className="px-8 sm:px-12 pt-12 pb-24 max-w-3xl mx-auto">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">키워드 관리</h1>
            <p className="text-sm text-[var(--color-notion-mute)] mt-1">
              키워드를 클릭하면 이름을 바꿀 수 있습니다. 삭제하면 모든 글에서
              제거됩니다.
            </p>
          </div>
          <a
            href="/search"
            target="_blank"
            className="notion-icon-btn text-sm shrink-0"
          >
            검색 페이지 →
          </a>
        </div>

        {tags.length === 0 ? (
          <div className="border border-dashed border-[var(--color-notion-rule)] rounded-xl p-16 text-center text-[var(--color-notion-mute)]">
            아직 등록된 키워드가 없습니다.
            <br />
            <span className="text-xs mt-2 block">
              글 편집 화면에서 키워드를 추가해 보세요.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-notion-rule)] border border-[var(--color-notion-rule)] rounded-xl overflow-hidden">
            {tags.map((t) => (
              <TagRow key={t.tag} tag={t.tag} count={t.count} />
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-[var(--color-notion-mute)]">
          총 {tags.length}개의 키워드 ·{" "}
          {tags.reduce((s, t) => s + t.count, 0)}회 사용
        </p>
      </div>
    </>
  );
}
