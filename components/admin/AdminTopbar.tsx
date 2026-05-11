import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
};

export function AdminTopbar({
  crumbs,
  right,
}: {
  crumbs: Crumb[];
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--admin-bg)] border-b border-[var(--admin-rule)] backdrop-blur-sm">
      <div className="px-6 h-12 flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm text-[var(--admin-ink-soft)] min-w-0">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            const content = (
              <span className="flex items-center gap-1.5">
                {c.icon && (
                  <span className="inline-flex items-center text-[var(--admin-mute)]">
                    {c.icon}
                  </span>
                )}
                <span className="truncate">{c.label}</span>
              </span>
            );
            return (
              <span key={i} className="flex items-center gap-1 min-w-0">
                {c.href ? (
                  <Link
                    href={c.href}
                    className="px-2 py-1 rounded-md hover:bg-[var(--admin-hover)] transition truncate"
                  >
                    {content}
                  </Link>
                ) : (
                  <span
                    className={`px-2 py-1 truncate ${
                      isLast ? "font-medium text-[var(--admin-ink)]" : ""
                    }`}
                  >
                    {content}
                  </span>
                )}
                {!isLast && (
                  <span className="text-[var(--admin-mute)] mx-0.5">›</span>
                )}
              </span>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
