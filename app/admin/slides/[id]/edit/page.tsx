import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { getSlide } from "@/lib/slides-db";
import { SlideForm } from "../../SlideForm";

export const dynamic = "force-dynamic";

export default async function EditSlidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slide = getSlide(Number(id));
  if (!slide) notFound();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "🖼️ 슬라이드", href: "/admin/slides" },
          { label: "편집" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">슬라이드 편집</h1>
        <SlideForm slide={slide} />
      </div>
    </>
  );
}
