import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

export async function NotificationBell({ userId }: { userId: string }) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <details className="relative">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
        <span className="relative">
          🔔
          {unreadCount > 0 ? (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          ) : null}
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <p className="px-2 py-1 text-xs font-semibold text-slate-500">Notifikasi</p>
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-slate-400">
            Belum ada notifikasi.
          </p>
        ) : (
          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                className={`block rounded-lg px-2 py-2 text-xs hover:bg-slate-50 ${
                  n.readAt ? "text-slate-500" : "bg-blue-50/60 text-slate-800"
                }`}
              >
                <p className="font-medium">{n.title}</p>
                <p className="mt-0.5 text-slate-500">{n.message}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {formatDateTime(n.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
