export function Footer() {
  return (
    <footer className="bg-[var(--color-ink)] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16 grid gap-10 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <div className="text-2xl font-bold mb-3 tracking-tight">
            永嘉 · YEONGGA
          </div>
          <p className="text-white/70 text-sm leading-relaxed max-w-md">
            오랜 인연으로 모인 회원들의 글과 모임을 기록하는 작은 매거진형
            아카이브입니다.
          </p>
        </div>
        <div className="sm:col-span-3">
          <div className="kicker text-white/50 mb-4">바로가기</div>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:text-white text-white/80">표지</a></li>
            <li><a href="/archive" className="hover:text-white text-white/80">아카이브</a></li>
            <li><a href="/about" className="hover:text-white text-white/80">회 소개</a></li>
          </ul>
        </div>
        <div className="sm:col-span-3">
          <div className="kicker text-white/50 mb-4">운영</div>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/admin" className="hover:text-white text-white/80">
                관리실
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-white/50 flex flex-wrap items-center justify-between gap-3">
          <span>© 영가회 永嘉會. 회 내부 보관 용도.</span>
          <span className="font-mono">v0.2 · YEONGGA ARCHIVE</span>
        </div>
      </div>
    </footer>
  );
}
