"use client";

import { useMobileNav } from "@/components/mobile-nav-context";

export function MenuButton() {
  const { openNav } = useMobileNav();
  return (
    <button
      type="button"
      onClick={openNav}
      aria-label="Buka menu navigasi"
      className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
      </svg>
    </button>
  );
}
