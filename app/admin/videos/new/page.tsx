import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { VideoForm } from "../VideoForm";

export default function NewVideoPage() {
  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "🎞️ 동영상", href: "/admin/videos" },
          { label: "새 동영상" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">새 동영상</h1>
        <VideoForm />
      </div>
    </>
  );
}
