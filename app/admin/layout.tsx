import type { ReactNode } from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminGuard from "@/components/auth/AdminGuard";

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#020617] text-zinc-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row lg:items-start lg:gap-8">
          <AdminSidebar />

          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}