// 푸터 — 라이트 모드: 아이보리 바탕 + 검정 텍스트
//        다크 모드:  검정 바탕 + 흰 텍스트
// .surface-tone 클래스가 globals.css 에서 데이터-테마 분기를 처리.
export function Footer() {
  return (
    <footer className="surface-tone border-t border-current/10">
      <div className="mx-auto max-w-6xl px-6 py-16 grid gap-10 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <div className="text-2xl font-bold mb-3 tracking-tight">
            永嘉 · YEONGGA
          </div>
          <p className="surface-soft text-sm leading-relaxed max-w-md mb-5">
            오랜 인연으로 모인 회원들의 글과 모임을 기록하는 작은 매거진형
            아카이브입니다.
          </p>
          <a
            href="/contribute"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-current/30 text-sm font-medium hover:bg-current/10 hover:border-current/60 transition"
          >
            ✉️ 자료 제공하기
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="sm:col-span-3">
          <div className="kicker surface-mute mb-4">바로가기</div>
          <ul className="space-y-2 text-sm surface-soft">
            <li><a href="/" className="hover:opacity-100 opacity-80">표지</a></li>
            <li><a href="/archive" className="hover:opacity-100 opacity-80">아카이브</a></li>
            <li><a href="/gallery" className="hover:opacity-100 opacity-80">갤러리</a></li>
            <li><a href="/about" className="hover:opacity-100 opacity-80">회 소개</a></li>
          </ul>
        </div>
        <div className="sm:col-span-3">
          <div className="kicker surface-mute mb-4">참여 · 운영</div>
          <ul className="space-y-2 text-sm surface-soft">
            <li>
              <a href="/contribute" className="hover:opacity-100 opacity-80">
                자료 제공
              </a>
            </li>
            <li>
              <a href="/admin" className="hover:opacity-100 opacity-80">
                집무실
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-current/10">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs surface-mute flex flex-wrap items-center justify-between gap-3">
          <span>© 영가회 永嘉會. 회 내부 보관 용도.</span>
          <span className="font-mono">v0.2 · YEONGGA ARCHIVE</span>
        </div>
      </div>
    </footer>
  );
}
