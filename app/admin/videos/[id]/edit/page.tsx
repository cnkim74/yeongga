import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { getVideo } from "@/lib/videos-db";
import { VideoForm } from "../../VideoForm";

export const dynamic = "force-dynamic";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = getVideo(Number(id));
  if (!video) notFound();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "🎞️ 동영상", href: "/admin/videos" },
          { label: "편집" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">동영상 편집</h1>
        <VideoForm video={video} />
      </div>
    </>
  );
}
