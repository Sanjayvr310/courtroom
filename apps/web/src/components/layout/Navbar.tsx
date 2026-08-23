"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#1A3318] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/pb.png"
              alt="The Court Room"
              width={44}
              height={44}
              className="object-contain"
              priority
            />
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname?.startsWith(link.href)
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/live"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold tracking-wide uppercase hover:bg-red-500 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#1A3318] bg-[#C9A84C] hover:bg-[#D4B86A] transition-all duration-200"
            >
              Admin
            </Link>
          </div>

          {/* ── Mobile Menu Button ── */}
          <button
            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#1A3318]">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname?.startsWith(link.href)
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10 flex gap-2">
              <Link href="/live" onClick={() => setMobileOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Live
              </Link>
              <Link href="/admin" onClick={() => setMobileOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center text-[#1A3318] bg-[#C9A84C]">
                Admin
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
