type Crumb = { label: string; href?: string };

export function AdminTopbar({
  crumbs,
  right,
}: {
  crumbs: Crumb[];
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--color-notion-bg)] border-b border-[var(--color-notion-rule)]">
      <div className="px-6 h-11 flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm text-[var(--color-notion-text)] min-w-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {c.href ? (
                <a
                  href={c.href}
                  className="px-1.5 py-0.5 rounded hover:bg-[var(--color-notion-hover)] truncate"
                >
                  {c.label}
                </a>
              ) : (
                <span className="px-1.5 py-0.5 truncate">{c.label}</span>
              )}
              {i < crumbs.length - 1 && (
                <span className="text-[var(--color-notion-mute)]">/</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
