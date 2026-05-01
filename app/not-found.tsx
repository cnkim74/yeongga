import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] grid place-items-center bg-[var(--color-bg-soft)] px-6">
      <div className="text-center max-w-xl">
        <div className="kicker text-[var(--color-ink-mute)] mb-4">404 · 不在</div>
        <h1 className="display text-5xl sm:text-7xl mb-5">
          찾으시는<br />글이 없습니다
        </h1>
        <p className="text-base sm:text-lg text-[var(--color-ink-soft)] mb-10 leading-relaxed">
          주소가 바뀌었거나, 아직 등재되지 않은 글일 수 있습니다.
        </p>
        <Link href="/" className="btn-pill">
          표지로 돌아가기 →
        </Link>
      </div>
    </div>
  );
}
