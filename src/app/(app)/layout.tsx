import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar session={session} />
        <main className="flex-1 overflow-x-hidden px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
