import Link from "next/link";
import AdminGuard from "@/components/auth/AdminGuard";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen max-w-[1600px]">
          <aside className="sticky top-0 h-screen w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 p-6">
            <Link
              href="/admin"
              className="block text-xl font-bold"
            >
              Panel administratora
            </Link>

            <p className="mt-2 text-sm text-zinc-500">
              Zarządzanie platformą
            </p>

            <nav className="mt-10 space-y-2">
              <Link
                href="/admin"
                className="block rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/admin/courses"
                className="block rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              >
                Kursy
              </Link>

              <Link
                href="/"
                className="block rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              >
                Zobacz stronę ucznia
              </Link>
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}