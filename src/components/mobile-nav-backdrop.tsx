"use client";

import { useMobileNav } from "@/components/mobile-nav-context";

export function MobileNavBackdrop() {
  const { open, closeNav } = useMobileNav();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
      onClick={closeNav}
      aria-hidden="true"
    />
  );
}
