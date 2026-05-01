import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { ArticleForm } from "../ArticleForm";

export default function NewArticlePage() {
  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "📝 글 관리", href: "/admin/articles" },
          { label: "새 글" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">새 글</h1>
        <ArticleForm />
      </div>
    </>
  );
}
