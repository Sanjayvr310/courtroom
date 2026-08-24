"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/live", label: "Live" },
  { href: "/players", label: "Players" },
  { href: "/rankings", label: "Rankings" },
  { href: "/umpire", label: "Umpire" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Hide the entire nav on the umpire scoring screen — it has its own top bar
  const isScoring = /^\/umpire\/[^/]+/.test(pathname ?? "");
  if (isScoring) return null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#1A3318] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              <Image src="/pb.png" alt="The Court Room" width={44} height={44} className="object-contain" priority />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/live"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold tracking-wide uppercase hover:bg-red-500 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Live
              </Link>
              <Link href="/admin"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-[#1A3318] bg-[#C9A84C] hover:bg-[#D4B86A] transition-all duration-200">
                Admin
              </Link>
              <button
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setOpen(true)} aria-label="Open menu">
                <Menu size={22} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      <div onClick={() => setOpen(false)} style={{
        position: "fixed", inset: 0, zIndex: 998,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s ease",
      }} />

      {/* Slide-in panel */}
      <div ref={panelRef} style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 280, zIndex: 999,
        background: "#0F2010",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-white font-bold text-base">Menu</span>
          <button onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className="flex items-center px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
                style={{
                  background: active ? "rgba(212,224,74,0.12)" : "transparent",
                  color: active ? "#D4E04A" : "rgba(255,255,255,0.65)",
                  border: active ? "1px solid rgba(212,224,74,0.2)" : "1px solid transparent",
                }}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-8 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
          <Link href="/live" onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-red-600 text-white text-sm font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Watch Live
          </Link>
          <Link href="/admin" onClick={() => setOpen(false)}
            className="flex items-center justify-center w-full py-3 rounded-2xl text-sm font-bold"
            style={{ background: "#C9A84C", color: "#1A3318" }}>
            Admin Panel
          </Link>
        </div>
      </div>
    </>
  );
}
