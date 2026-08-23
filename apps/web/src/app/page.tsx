import Link from "next/link";
import Image from "next/image";
import { Trophy, Zap, Users, BarChart3, ArrowRight, MapPin } from "lucide-react";

const upcomingTournaments = [
  { id: "1", name: "Bangalore Open 2026", city: "Bangalore", date: "Aug 25–27", players: 128, prize: "₹2,00,000", status: "REGISTRATION_OPEN" },
  { id: "2", name: "Mumbai Masters", city: "Mumbai", date: "Sep 5–7", players: 64, prize: "₹1,50,000", status: "UPCOMING" },
  { id: "3", name: "Delhi Slam", city: "Delhi", date: "Sep 15–17", players: 96, prize: "₹1,00,000", status: "UPCOMING" },
];

const stats = [
  { label: "Active Tournaments", value: "12", icon: Trophy },
  { label: "Live Matches", value: "8", icon: Zap },
  { label: "Registered Players", value: "2,400+", icon: Users },
  { label: "Matches Played", value: "18,500+", icon: BarChart3 },
];

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "#FDFAF5" }}>

      {/* ── Hero — Court background + Glassmorphism ── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">

        {/* Logo.png as blurred background — fills the whole section */}
        <div className="absolute inset-0 overflow-hidden" style={{ background: "#0F2010" }}>
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-cover select-none pointer-events-none"
            style={{
              filter: "blur(8px) brightness(0.3) saturate(0.5)",
              transform: "scale(1.08)",
            }}
            priority
          />
        </div>

        {/* Dark green overlay */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(15,32,16,0.55) 0%, rgba(26,51,24,0.45) 50%, rgba(28,43,58,0.5) 100%)" }} />

        {/* Ambient gold glow — top left */}
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.6) 0%, transparent 65%)", filter: "blur(50px)" }} />

        {/* Content */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center text-center">

            {/* Logo — crisp, no blur */}
            <div className="relative mb-6">
              {/* Subtle gold ring */}
              <div className="absolute -inset-3 rounded-full"
                style={{ border: "1px solid rgba(201,168,76,0.25)" }} />
              <Image
                src="/pb.png"
                alt="The Court Room"
                width={100}
                height={100}
                className="relative object-contain"
                style={{ mixBlendMode: "screen", filter: "brightness(1.15)" }}
                priority
              />
            </div>

            {/* Brand name */}
            <div className="mb-5">
              <div className="text-[10px] font-medium tracking-[0.3em] uppercase mb-1" style={{ color: "rgba(201,168,76,0.5)" }}>the</div>
              <div className="font-display font-bold leading-none tracking-tight" style={{ fontSize: "clamp(2.8rem, 8vw, 6rem)", color: "white" }}>
                COURT <span style={{ color: "#C9A84C" }}>ROOM</span>
              </div>
            </div>

            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7"
              style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", backdropFilter: "blur(4px)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#C9A84C" }}>Live Now</span>
            </div>

            {/* Catchy tagline */}
            <h1 className="font-display font-bold text-white leading-tight mb-3 max-w-3xl"
              style={{ fontSize: "clamp(1.8rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}>
              Where Every Point{" "}
              <span style={{ color: "#C9A84C" }}>Counts.</span>
            </h1>

            <p className="text-base md:text-lg leading-relaxed mb-10 max-w-xl" style={{ color: "rgba(255,255,255,0.55)" }}>
              Run tournaments. Track live scores. Crown champions. — All from one court.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center gap-3 mb-14">
              <Link href="/tournaments"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: "#C9A84C", color: "#0F2010", boxShadow: "0 4px 24px rgba(201,168,76,0.35)" }}>
                Browse Tournaments
                <ArrowRight size={15} />
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

            {/* Glassmorphism stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label}
                  className="rounded-2xl p-4 text-center transition-all duration-200 hover:scale-[1.03]"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    backdropFilter: "blur(6px)",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)"
                  }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: "rgba(201,168,76,0.15)" }}>
                    <Icon size={15} style={{ color: "#C9A84C" }} />
                  </div>
                  <div className="font-display text-xl font-bold text-white">{value}</div>
                  <div className="text-[10px] mt-0.5 font-medium tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade to cream */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #FDFAF5)" }} />
      </section>

      {/* ── Upcoming Tournaments ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8" style={{ background: "#C9A84C" }} />
              <span className="text-[10px] font-semibold tracking-[0.25em] uppercase" style={{ color: "#8A8070" }}>Events</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold" style={{ color: "#1A3318" }}>Upcoming Tournaments</h2>
          </div>
          <Link href="/tournaments" className="hidden md:inline-flex items-center gap-2 font-medium transition-colors text-sm hover:opacity-70"
            style={{ color: "#2D5A27" }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {upcomingTournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`}>
              <div className="bg-white rounded-2xl overflow-hidden group hover:shadow-[0_8px_40px_rgba(26,51,24,0.14)] transition-all duration-300"
                style={{ boxShadow: "0 2px 16px rgba(26,51,24,0.08)", border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="p-5" style={{ background: "#1A3318" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white group-hover:text-[#C9A84C] transition-colors">
                        {t.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <MapPin size={11} style={{ color: "rgba(201,168,76,0.5)" }} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{t.city}</span>
                      </div>
                    </div>
                    {t.status === "REGISTRATION_OPEN" && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "#C9A84C", color: "#1A3318" }}>
                        Open
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Date</div>
                      <div className="text-sm font-semibold" style={{ color: "#1A3318" }}>{t.date}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Players</div>
                      <div className="text-sm font-semibold" style={{ color: "#1A3318" }}>{t.players}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Prize</div>
                      <div className="text-sm font-bold" style={{ color: "#C9A84C" }}>{t.prize}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold"
                          style={{ background: "#E8E0D0", color: "#1A3318" }}>
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                      <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: "#2D5A27" }}>
                        +{t.players - 4}
                      </div>
                    </div>
                    <span className="text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                      style={{ color: "#2D5A27" }}>
                      View <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20" style={{ background: "#1A3318" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-px w-8" style={{ background: "rgba(201,168,76,0.4)" }} />
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase" style={{ color: "rgba(201,168,76,0.5)" }}>Platform</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-12">Built for the game</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: "⚡", title: "Real-Time Scores", desc: "Live score updates pushed instantly. No refresh needed." },
              { icon: "🏆", title: "Smart Brackets", desc: "Automatic bracket generation for Round Robin, Pool + Knockout, and Elimination." },
              { icon: "📱", title: "Umpire App", desc: "Mobile-first scoring interface. One tap to score, undo, or end a game." },
              { icon: "📊", title: "Live Standings", desc: "Real-time standings with points, win rate, and head-to-head records." },
              { icon: "🎯", title: "DUPR Integration", desc: "Player ratings, seeding, match history, and rating changes all tracked." },
              { icon: "🖥️", title: "Court Dashboard", desc: "Admin control room with live court status and match assignment." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl p-6 hover:bg-white/5 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl p-10 md:p-16 text-center"
          style={{ background: "linear-gradient(135deg, #C9A84C 0%, #D4B86A 50%, #C9A84C 100%)" }}>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4" style={{ color: "#1A3318" }}>
            Ready to run your tournament?
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "rgba(26,51,24,0.65)" }}>
            Set up in minutes. Invite players, assign courts, and go live.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/tournaments/new" className="px-8 py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all hover:scale-[1.02]"
              style={{ background: "#1A3318", boxShadow: "0 4px 24px rgba(26,51,24,0.3)" }}>
              Create Tournament
            </Link>
            <Link href="/tournaments" className="px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02]"
              style={{ border: "2px solid rgba(26,51,24,0.4)", color: "#1A3318" }}>
              Browse Events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
