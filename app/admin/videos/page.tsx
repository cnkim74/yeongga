import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { listVideos } from "@/lib/videos-db";
import { deleteVideoAction, setFeaturedAction } from "./actions";

export const dynamic = "force-dynamic";

export default function AdminVideos() {
  const videos = listVideos();
  const featured = videos.find((v) => v.featured);

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "🎞️ 동영상" },
        ]}
        right={
          <Link
            href="/admin/videos/new"
            className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
          >
            + 새 동영상
          </Link>
        }
      />

      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <div className="text-7xl mb-3 leading-none select-none">🎞️</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          동영상 아카이브
        </h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-6 max-w-2xl">
          유튜브·비메오 등 외부 영상 URL을 등록하면 공개 사이트의{" "}
          <code className="bg-[var(--color-notion-hover)] px-1 rounded">
            /videos
          </code>{" "}
          페이지와, ⭐ 표시한 한 편이 메인 추천 영상으로 노출됩니다.
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-8">
          <Prop k="총" v={`${videos.length}편`} />
          <Prop k="추천" v={featured ? `⭐ ${featured.title}` : "없음"} />
        </div>

        {videos.length === 0 ? (
          <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
            <div className="text-5xl mb-3">🎞️</div>
            <div className="text-base font-medium mb-1">아직 영상이 없습니다</div>
            <div className="text-sm text-[var(--color-notion-mute)] mb-4">
              유튜브/비메오 URL만 있으면 추가할 수 있습니다.
            </div>
            <Link
              href="/admin/videos/new"
              className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
            >
              + 새 동영상
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {videos.map((v) => (
              <li
                key={v.id}
                className="border border-[var(--color-notion-rule)] rounded-lg overflow-hidden flex"
              >
                <div className="w-44 aspect-video bg-[var(--color-notion-hover)] shrink-0 relative">
                  {v.thumbnail_url ? (
                    <img
                      src={v.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[var(--color-notion-mute)]">
                      ▶
                    </div>
                  )}
                  {v.featured === 1 && (
                    <span className="absolute top-2 left-2 notion-tag tag-yellow">
                      ⭐ 추천
                    </span>
                  )}
                </div>
                <div className="flex-1 px-4 py-3 min-w-0 flex flex-col justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-[var(--color-notion-mute)] font-mono uppercase tracking-wider mb-1">
                      {v.kicker ?? "—"} ·{" "}
                      <span className="lowercase">{v.provider ?? "외부"}</span>
                    </div>
                    <Link
                      href={`/admin/videos/${v.id}/edit`}
                      className="text-base font-semibold hover:underline line-clamp-1"
                    >
                      {v.title}
                    </Link>
                    {v.description && (
                      <p className="text-sm text-[var(--color-notion-mute)] line-clamp-1 mt-0.5">
                        {v.description}
                      </p>
                    )}
                  </div>
                  <a
                    href={v.embed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--color-notion-accent)] hover:underline truncate"
                  >
                    {v.embed_url}
                  </a>
                </div>
                <div className="px-3 py-3 flex flex-col items-end gap-2 border-l border-[var(--color-notion-rule)] shrink-0 min-w-[110px]">
                  <Link
                    href={`/admin/videos/${v.id}/edit`}
                    className="notion-icon-btn"
                  >
                    편집
                  </Link>
                  {v.featured !== 1 && (
                    <form action={setFeaturedAction}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        className="notion-icon-btn text-xs"
                      >
                        ⭐ 추천으로
                      </button>
                    </form>
                  )}
                  <ConfirmDelete
                    action={deleteVideoAction}
                    hidden={{ id: v.id }}
                    message="이 영상을 삭제할까요?"
                    className="notion-icon-btn text-xs text-[#c4554d] hover:bg-[#ffe2dd]"
                  >
                    삭제
                  </ConfirmDelete>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Prop({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-notion-mute)]">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
