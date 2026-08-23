"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Trophy, Zap, Users, BarChart3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Reveal wrapper ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Live stats from localStorage ──────────────────────────────────────────────
function useLiveStats() {
  const [stats, setStats] = useState({ tournaments: 0, liveMatches: 0, players: 0, matchesPlayed: 0 });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("courtroom_tournaments_v2");
      const tournaments: { status: string; registrations?: { status: string }[]; categories?: unknown[] }[] = raw ? JSON.parse(raw) : [];
      const matchRaw = localStorage.getItem("courtroom_matches_v1");
      const matches: Record<string, { state: { status: string } }> = matchRaw ? JSON.parse(matchRaw) : {};
      const matchList = Object.values(matches);
      setStats({
        tournaments: tournaments.length,
        liveMatches: matchList.filter(m => m.state.status === "GAME_IN_PROGRESS").length,
        players: tournaments.reduce((acc, t) => acc + (t.registrations?.filter(r => r.status === "approved").length ?? 0), 0),
        matchesPlayed: matchList.filter(m => m.state.status === "MATCH_COMPLETED" || m.state.status === "FORFEITED").length,
      });
    } catch { /* ignore */ }
  }, []);
  return stats;
}

const features = [
  { icon: "⚡", title: "Real-Time Scores", desc: "Live score updates pushed instantly. No refresh needed." },
  { icon: "🏆", title: "Smart Brackets", desc: "Automatic bracket generation for Round Robin, Pool + Knockout, and Elimination." },
  { icon: "📱", title: "Umpire App", desc: "Mobile-first scoring interface. One tap to score, undo, or end a game." },
  { icon: "📊", title: "Live Standings", desc: "Real-time standings with points, win rate, and head-to-head records." },
  { icon: "🎯", title: "DUPR Integration", desc: "Player ratings, seeding, match history, and rating changes all tracked." },
  { icon: "🖥️", title: "Court Dashboard", desc: "Admin control room with live court status and match assignment." },
];

export default function HomePage() {
  const stats = useLiveStats();

  return (
    <div className="min-h-screen" style={{ background: "#FDFAF5" }}>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 overflow-hidden" style={{ background: "#0F2010" }}>
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-cover select-none pointer-events-none"
            style={{ filter: "blur(8px) brightness(0.3) saturate(0.5)", transform: "scale(1.08)" }}
            priority
          />
        </div>
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(15,32,16,0.55) 0%, rgba(26,51,24,0.45) 50%, rgba(28,43,58,0.5) 100%)" }} />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.6) 0%, transparent 65%)", filter: "blur(50px)" }} />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute -inset-3 rounded-full" style={{ border: "1px solid rgba(201,168,76,0.25)" }} />
              <Image src="/pb.png" alt="The Court Room" width={100} height={100}
                className="relative object-contain"
                style={{ mixBlendMode: "screen", filter: "brightness(1.15)" }}
                priority
              />
            </div>

            <div className="mb-5">
              <div className="text-[10px] font-medium tracking-[0.3em] uppercase mb-1" style={{ color: "rgba(201,168,76,0.5)" }}>the</div>
              <div className="font-display font-bold leading-none tracking-tight" style={{ fontSize: "clamp(2.8rem, 8vw, 6rem)", color: "white" }}>
                COURT <span style={{ color: "#C9A84C" }}>ROOM</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7"
              style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", backdropFilter: "blur(4px)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#C9A84C" }}>Live Now</span>
            </div>

            <h1 className="font-display font-bold text-white leading-tight mb-3 max-w-3xl"
              style={{ fontSize: "clamp(1.8rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}>
              Where Every Point{" "}
              <span style={{ color: "#C9A84C" }}>Counts.</span>
            </h1>

            <p className="text-base md:text-lg leading-relaxed mb-10 max-w-xl" style={{ color: "rgba(255,255,255,0.55)" }}>
              Run tournaments. Track live scores. Crown champions. — All from one court.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-14">
              <Link href="/tournaments"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: "#C9A84C", color: "#0F2010", boxShadow: "0 4px 24px rgba(201,168,76,0.35)" }}>
                Browse Tournaments <ArrowRight size={15} />
              </Link>
              <Link href="/live"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.35)", color: "#FCA5A5", backdropFilter: "blur(4px)" }}>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Watch Live
              </Link>
              <Link href="/admin"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", backdropFilter: "blur(4px)" }}>
                Admin Panel
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #FDFAF5)" }} />
      </section>

      {/* ── Live Stats (real data from localStorage) ── */}
      {(stats.tournaments > 0 || stats.matchesPlayed > 0) && (
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Tournaments", value: stats.tournaments, icon: Trophy, show: stats.tournaments > 0 },
              { label: "Live Matches", value: stats.liveMatches, icon: Zap, show: true },
              { label: "Registered Players", value: stats.players, icon: Users, show: stats.players > 0 },
              { label: "Matches Played", value: stats.matchesPlayed, icon: BarChart3, show: stats.matchesPlayed > 0 },
            ].filter(s => s.show).map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl p-5 text-center bg-white"
                style={{ boxShadow: "0 2px 16px rgba(26,51,24,0.08)", border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: "rgba(201,168,76,0.1)" }}>
                  <Icon size={16} style={{ color: "#C9A84C" }} />
                </div>
                <div className="font-display text-2xl font-bold" style={{ color: "#1A3318" }}>{value}</div>
                <div className="text-[11px] mt-0.5 font-medium" style={{ color: "#8A8070" }}>{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* ── Features ── */}
      <section className="py-20" style={{ background: "#1A3318" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex items-center gap-4 mb-3">
              <div className="h-px w-8" style={{ background: "rgba(201,168,76,0.4)" }} />
              <span className="text-[10px] font-semibold tracking-[0.25em] uppercase" style={{ color: "rgba(201,168,76,0.5)" }}>Platform</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-12">Built for the game</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="rounded-2xl p-6 hover:bg-white/5 transition-colors h-full"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Reveal>
          <div className="rounded-3xl p-10 md:p-16 text-center"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #D4B86A 50%, #C9A84C 100%)" }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4" style={{ color: "#1A3318" }}>
              Ready to run your tournament?
            </h2>
            <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "rgba(26,51,24,0.65)" }}>
              Set up in minutes. Invite players, assign courts, and go live.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/admin" className="px-8 py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all hover:scale-[1.02]"
                style={{ background: "#1A3318", boxShadow: "0 4px 24px rgba(26,51,24,0.3)" }}>
                Go to Admin Panel
              </Link>
              <Link href="/umpire" className="px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02]"
                style={{ border: "2px solid rgba(26,51,24,0.4)", color: "#1A3318" }}>
                Umpire Console
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
