import { ROLE_LABELS } from "@/lib/constants";
import type { SessionPayload } from "@/lib/session";
import { logoutAction } from "@/actions/auth";
import { NotificationBell } from "@/components/notification-bell";

export function Topbar({ session }: { session: SessionPayload }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div>
        <p className="text-sm font-semibold text-slate-900">{session.fullName}</p>
        <p className="text-xs text-slate-500">
          {ROLE_LABELS[session.role]}
          {session.workUnitName ? ` · ${session.workUnitName}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell userId={session.userId} />
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Keluar
          </button>
        </form>
      </div>
    </header>
  );
}
