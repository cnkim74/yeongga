import { AdminTopbar } from "./AdminTopbar";

export function EmptyDbPage({
  icon,
  title,
  description,
  crumbLabel,
}: {
  icon: string;
  title: string;
  description: string;
  crumbLabel: string;
}) {
  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: crumbLabel },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <div className="text-7xl mb-3 leading-none select-none">{icon}</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-10 max-w-2xl">
          {description}
        </p>

        <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
          <div className="text-5xl mb-3 select-none">🗒️</div>
          <div className="text-base font-medium mb-1">아직 비어 있습니다</div>
          <div className="text-sm text-[var(--color-notion-mute)] mb-4">
            데이터베이스 연결 후 항목을 추가하시면 이 자리에 표시됩니다.
          </div>
          <button
            type="button"
            className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
          >
            + 새 항목
          </button>
        </div>
      </div>
    </>
  );
}
