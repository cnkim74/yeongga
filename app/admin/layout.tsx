import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "관리실 — 영가회",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="notion-shell flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 min-h-screen">{children}</div>
    </div>
  );
}
