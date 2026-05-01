// 글쓴이용 작은 원형 아바타 — 사진 있으면 사진, 없으면 이름 첫 글자
export function AuthorAvatar({
  src,
  name,
  size = 24,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-full object-cover bg-[var(--color-bg-deep)] shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = name.trim().slice(0, 1) || "·";
  return (
    <span
      aria-hidden="true"
      className="rounded-full bg-[var(--color-bg-deep)] text-[var(--color-ink-soft)] grid place-items-center font-medium shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.45),
      }}
    >
      {initial}
    </span>
  );
}
