import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { listSlides } from "@/lib/slides-db";
import { listVideos } from "@/lib/videos-db";
import { listUsers } from "@/lib/users-db";
import { getCurrentUser } from "@/lib/auth";
import { chapters, getChapterArticles } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const me = await getCurrentUser();
  const slides = listSlides();
  const videos = listVideos();
  const users = listUsers();
  const totalArticles = chapters
    .map((c) => getChapterArticles(c.slug).length)
    .reduce((a, b) => a + b, 0);

  const activeSlides = slides.filter((s) => s.active).length;
  const featuredVideo = videos.find((v) => v.featured);

  return (
    <>
      <AdminTopbar crumbs={[{ label: "🏠 관리실 홈" }]} />
      <div className="max-w-[960px] mx-auto px-12 pt-16 pb-24">
        <div className="text-7xl mb-4 leading-none select-none">🗂️</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          영가회 관리실
        </h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-10">
          {me?.name} 관리자님, 안녕하세요. 공개 사이트와 분리된 작업 공간입니다.
        </p>

        <div className="border border-[var(--color-notion-rule)] rounded-md mb-10 divide-y divide-[var(--color-notion-rule)]">
          <PropRow label="현재 로그인" value={`${me?.name} (@${me?.username})`} />
          <PropRow label="활성 슬라이드" value={`${activeSlides} / ${slides.length}장`} />
          <PropRow label="추천 영상" value={featuredVideo?.title ?? "지정 안 됨"} />
        </div>

        <h2 className="text-xl font-semibold mb-3">데이터베이스</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <DbCard
            href="/admin/slides"
            icon="🖼️"
            title="홈 슬라이드"
            stat={`${activeSlides}장`}
            sub={`총 ${slides.length}장 중 활성`}
          />
          <DbCard
            href="/admin/videos"
            icon="🎞️"
            title="동영상"
            stat={`${videos.length}편`}
            sub={featuredVideo ? "⭐ 추천 지정됨" : "추천 없음"}
          />
          <DbCard
            href="/admin/articles"
            icon="📝"
            title="글 관리"
            stat={`${totalArticles}편`}
            sub="장(章)별 분류"
          />
          <DbCard
            href="/admin/members"
            icon="👥"
            title="회원 명부"
            stat={`${users.length}명`}
            sub={`관리자 ${users.filter((u) => u.role === "admin").length}명`}
          />
        </div>

        <h2 className="text-xl font-semibold mb-3">최근 회원</h2>
        <ul className="text-sm space-y-1">
          {users.slice(0, 6).map((u) => (
            <li
              key={u.id}
              className="flex items-baseline gap-3 px-2 py-1.5 rounded hover:bg-[var(--color-notion-hover)]"
            >
              <span className="w-6 text-center">
                {u.role === "admin" ? "🛡️" : "👤"}
              </span>
              <Link href={`/admin/members/${u.id}/edit`} className="hover:underline font-medium">
                {u.name}
              </Link>
              <span className="text-[var(--color-notion-mute)] font-mono text-xs">
                @{u.username}
              </span>
              <span className="ml-auto text-[var(--color-notion-mute)] text-xs">
                {u.joined_at ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 text-sm">
      <div className="w-32 text-[var(--color-notion-mute)] shrink-0">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function DbCard({
  href,
  icon,
  title,
  stat,
  sub,
}: {
  href: string;
  icon: string;
  title: string;
  stat: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-[var(--color-notion-rule)] rounded-md p-4 hover:bg-[var(--color-notion-hover)] transition"
    >
      <div className="flex items-center gap-2 text-base mb-2">
        <span aria-hidden="true">{icon}</span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="text-2xl font-semibold mb-1">{stat}</div>
      <div className="text-xs text-[var(--color-notion-mute)]">{sub}</div>
    </Link>
  );
}
