import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { SlideForm } from "../SlideForm";

export default function NewSlidePage() {
  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "🖼️ 슬라이드", href: "/admin/slides" },
          { label: "새 슬라이드" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">새 슬라이드</h1>
        <SlideForm />
      </div>
    </>
  );
}
