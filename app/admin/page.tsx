import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import {
  IconHome,
  IconSlides,
  IconVideo,
  IconArticle,
  IconGallery,
  IconEbook,
  IconMembers,
  IconTag,
  IconBackground,
} from "@/components/admin/AdminIcons";
import { listSlides } from "@/lib/slides-db";
import { countVideos } from "@/lib/videos-db";
import { countUsers, listRecentUsers } from "@/lib/users-db";
import { getCurrentUser } from "@/lib/auth";
import { countAllArticles } from "@/lib/articles-db";
import { listAllTags } from "@/lib/tags-db";
import { listPageBackgrounds } from "@/lib/backgrounds-db";
import { listCategories, countPhotos } from "@/lib/gallery-db";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const me = await getCurrentUser();
  const [
    slides,
    videoStats,
    userStats,
    recentUsers,
    totalArticles,
    allTags,
    backgrounds,
    categories,
    photoCount,
  ] = await Promise.all([
    listSlides(),
    countVideos(),       // 풀스캔 대신 COUNT(*)
    countUsers(),        // 풀스캔 대신 COUNT(*)
    listRecentUsers(6),  // 6명만 가져옴
    countAllArticles(),
    listAllTags(),
    listPageBackgrounds(),
    listCategories(),
    countPhotos(),       // 풀스캔 + JOIN 대신 COUNT(*)
  ]);

  const activeSlides = slides.filter((s) => s.active).length;
  const activeBgs = backgrounds.filter((b) => b.active && b.image_path !== null).length;
  const featuredTitle = videoStats.featuredTitle;

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: "집무실 홈", icon: <IconHome size={14} /> }]}
      />

      <div className="max-w-[1040px] mx-auto px-10 pt-14 pb-24">
        {/* ─── 인장 헤더 ─── */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <div className="seal-mark">執</div>
            <div className="font-serif text-xs tracking-[0.4em] text-[var(--admin-mute)] uppercase">
              YEONGGA · OFFICE
            </div>
          </div>

          <h1 className="font-serif text-[44px] leading-tight tracking-tight text-[var(--admin-ink)] mb-3">
            영가회 집무실
            <span className="font-serif text-[18px] text-[var(--admin-mute)] ml-3 align-middle">
              執務室
            </span>
          </h1>

          <p className="text-[var(--admin-ink-soft)] text-[15px] leading-relaxed max-w-xl">
            {me?.name} 관리자님, 안녕하십니까.
            <br />
            공개 사이트와 분리된 운영 공간입니다.
          </p>
        </div>

        {/* ─── 현황 요약 패널 ─── */}
        <div className="admin-summary mb-14">
          <SummaryRow label="현재 로그인" value={`${me?.name} (@${me?.username})`} />
          <SummaryRow label="활성 슬라이드" value={`${activeSlides} / ${slides.length}장`} />
          <SummaryRow label="추천 영상" value={featuredTitle ?? "지정 안 됨"} />
        </div>

        {/* ─── 데이터 관리 ─── */}
        <SectionTitle ko="데이터 관리" hanja="管理" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
          <DbCard href="/admin/slides"      Icon={IconSlides}     title="홈 슬라이드"
                  stat={`${activeSlides}장`} sub={`총 ${slides.length}장 중 활성`} />
          <DbCard href="/admin/videos"      Icon={IconVideo}      title="동영상"
                  stat={`${videoStats.total}편`} sub={featuredTitle ? "추천 지정됨" : "추천 없음"} />
          <DbCard href="/admin/articles"    Icon={IconArticle}    title="글 관리"
                  stat={`${totalArticles}편`} sub="장(章)별 분류" />
          <DbCard href="/admin/gallery"     Icon={IconGallery}    title="사진 갤러리"
                  stat={`${photoCount}장`} sub={`카테고리 ${categories.length}개`} />
          <DbCard href="/admin/ebooks"      Icon={IconEbook}      title="이북"
                  stat="—" sub="PDF 자료" />
          <DbCard href="/admin/members"     Icon={IconMembers}    title="회원 명부"
                  stat={`${userStats.total}명`} sub={`관리자 ${userStats.admins}명`} />
          <DbCard href="/admin/tags"        Icon={IconTag}        title="키워드"
                  stat={`${allTags.length}개`} sub="태그 관리 · 삭제" />
          <DbCard href="/admin/backgrounds" Icon={IconBackground} title="페이지 배경"
                  stat={`${activeBgs}개`} sub="배경 이미지 관리" />
        </div>

        {/* ─── 최근 회원 ─── */}
        <SectionTitle ko="최근 회원" hanja="名簿" />

        <ul className="rounded-lg border border-[var(--admin-rule)] bg-[var(--admin-surface)] divide-y divide-[var(--admin-rule-soft)] overflow-hidden">
          {recentUsers.map((u) => (
            <li key={u.id} className="member-row">
              <span className="member-mark">
                {u.role === "admin" ? "印" : "·"}
              </span>
              <Link
                href={`/admin/members/${u.id}/edit`}
                className="font-medium text-[var(--admin-ink)] hover:underline underline-offset-2"
              >
                {u.name}
              </Link>
              <span className="text-[var(--admin-mute)] font-mono text-xs">
                @{u.username}
              </span>
              <span className="ml-auto text-[var(--admin-mute)] text-xs font-mono tabular-nums">
                {u.joined_at ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function SectionTitle({ ko, hanja }: { ko: string; hanja: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <h2 className="font-serif text-xl text-[var(--admin-ink)]">{ko}</h2>
      <span className="font-serif text-sm text-[var(--admin-mute)] tracking-widest">
        {hanja}
      </span>
      <div className="flex-1 border-t border-[var(--admin-rule)] mt-2.5" />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 text-sm">
      <div className="w-28 text-[var(--admin-mute)] shrink-0 text-xs tracking-wider">
        {label}
      </div>
      <div className="text-[var(--admin-ink)] font-medium">{value}</div>
    </div>
  );
}

function DbCard({
  href,
  Icon,
  title,
  stat,
  sub,
}: {
  href: string;
  Icon: (p: { size?: number; className?: string }) => React.JSX.Element;
  title: string;
  stat: string;
  sub: string;
}) {
  return (
    <Link href={href} className="db-card group">
      <div className="flex items-center justify-between mb-4">
        <span className="db-card-icon">
          <Icon size={18} />
        </span>
        <span className="text-[10px] tracking-widest text-[var(--admin-mute)] uppercase">
          {sub}
        </span>
      </div>
      <div className="font-serif text-2xl text-[var(--admin-ink)] mb-1 tabular-nums">
        {stat}
      </div>
      <div className="text-[13px] text-[var(--admin-ink-soft)] font-medium">
        {title}
      </div>
    </Link>
  );
}
