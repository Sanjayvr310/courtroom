"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy, Users, Globe, Lock, ChevronRight, Shuffle, Plus, Calendar, MapPin, Trash2, AlertTriangle,
} from "lucide-react";
import {
  getTournaments, Tournament, getTournamentStatusLabel, getTournamentStatusColor, formatPrize,
  clearAllData,
} from "@/lib/store";

export default function AdminPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setTournaments(getTournaments());
  }, []);

  function handleClearAll() {
    clearAllData();
    setTournaments([]);
    setShowClearConfirm(false);
  }

  const totalRegs = tournaments.reduce((sum, t) => sum + (t.registrations?.length ?? 0), 0);
  const pendingRegs = tournaments.reduce((sum, t) => sum + (t.registrations?.filter((r) => r.status === "pending").length ?? 0), 0);
  const publishedDraws = tournaments.reduce((sum, t) => sum + t.categories.filter((c) => c.drawPublished).length, 0);
  const openRegs = tournaments.reduce((sum, t) => sum + t.categories.filter((c) => c.registrationOpen).length, 0);

  // Categorise tournaments
  const today = new Date().toISOString().slice(0, 10);
  const currentTournaments = tournaments.filter(
    (t) => t.status === "ongoing" || (t.startDate <= today && t.endDate >= today)
  );
  const upcomingTournaments = tournaments.filter(
    (t) => t.status !== "completed" && t.startDate > today
  );
  const pastTournaments = tournaments.filter(
    (t) => t.status === "completed" || t.endDate < today
  );

  return (
    <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
      {/* Clear Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#FEF2F2" }}>
                <AlertTriangle size={28} style={{ color: "#DC2626" }} />
              </div>
              <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>Clear All Data?</h2>
              <p className="text-sm" style={{ color: "#8A8070" }}>
                This will permanently delete <strong>all tournaments, registrations, draws, and match scores</strong> from this device. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "#F8F4EE", color: "#8A8070", border: "1px solid rgba(232,224,208,0.8)" }}>
                Cancel
              </button>
              <button onClick={handleClearAll}
                className="flex-1 py-3 rounded-2xl text-sm font-bold"
                style={{ background: "#DC2626", color: "white" }}>
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A3318 0%, #2D5A27 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(201,168,76,0.6)" }}>Admin</div>
              <h1 className="font-display text-3xl font-bold text-white">Control Room</h1>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Manage tournaments, registrations &amp; draws</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(220,38,38,0.15)", color: "#FCA5A5", border: "1px solid rgba(220,38,38,0.3)" }}>
                <Trash2 size={14} /> Clear All Data
              </button>
              <Link href="/admin/tournaments"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                style={{ background: "#C9A84C", color: "#1A3318" }}>
                <Plus size={14} /> New Tournament
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Tournaments", value: tournaments.length },
              { label: "Total Registrations", value: totalRegs },
              { label: "Pending Review", value: pendingRegs },
              { label: "Published Draws", value: publishedDraws },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="font-display text-3xl font-bold text-white">{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tournaments.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-3xl p-20 text-center" style={{ border: "2px dashed rgba(201,168,76,0.3)" }}>
            <Trophy size={48} style={{ color: "#C9A84C", margin: "0 auto 16px" }} />
            <h2 className="font-display text-2xl font-bold mb-3" style={{ color: "#1A3318" }}>No tournaments yet</h2>
            <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: "#8A8070" }}>
              Create your first tournament to start managing registrations, draws, and matches.
            </p>
            <Link href="/admin/tournaments"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base"
              style={{ background: "#C9A84C", color: "#1A3318" }}>
              <Plus size={16} /> Create Tournament
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/admin/tournaments"
                className="bg-white rounded-2xl p-5 flex flex-col items-center gap-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F8F4EE" }}>
                  <Trophy size={18} style={{ color: "#C9A84C" }} />
                </div>
                <div className="text-sm font-bold" style={{ color: "#1A3318" }}>Tournaments</div>
                <div className="text-xs" style={{ color: "#8A8070" }}>Create &amp; manage</div>
              </Link>
              <Link href="/admin/tournaments"
                className="bg-white rounded-2xl p-5 flex flex-col items-center gap-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                  <Users size={18} style={{ color: "#D97706" }} />
                </div>
                <div className="text-sm font-bold" style={{ color: "#1A3318" }}>Registrations</div>
                <div className="text-xs" style={{ color: "#8A8070" }}>
                  {pendingRegs > 0 ? <span style={{ color: "#D97706" }}>{pendingRegs} pending</span> : "All reviewed"}
                </div>
              </Link>
              <Link href="/admin/tournaments"
                className="bg-white rounded-2xl p-5 flex flex-col items-center gap-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F0FDF4" }}>
                  <Shuffle size={18} style={{ color: "#16A34A" }} />
                </div>
                <div className="text-sm font-bold" style={{ color: "#1A3318" }}>Draws</div>
                <div className="text-xs" style={{ color: "#8A8070" }}>{publishedDraws} published</div>
              </Link>
              <Link href="/umpire/all"
                className="bg-white rounded-2xl p-5 flex flex-col items-center gap-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                  <Globe size={18} style={{ color: "#2563EB" }} />
                </div>
                <div className="text-sm font-bold" style={{ color: "#1A3318" }}>Umpire Console</div>
                <div className="text-xs" style={{ color: "#8A8070" }}>Score matches</div>
              </Link>
            </div>

            {/* ── Current / Live Tournaments ── */}
            {currentTournaments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>Current Tournament</h2>
                </div>
                <div className="space-y-3">
                  {currentTournaments.map((t) => <TournamentCard key={t.id} t={t} highlight />)}
                </div>
              </div>
            )}

            {/* ── Upcoming Tournaments ── */}
            {upcomingTournaments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>Upcoming</h2>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#F0FDF4", color: "#16A34A" }}>
                    {upcomingTournaments.length} scheduled
                  </span>
                </div>
                <div className="space-y-3">
                  {upcomingTournaments.map((t) => <TournamentCard key={t.id} t={t} />)}
                </div>
              </div>
            )}

            {/* ── All Tournaments (if no categorisation applies) ── */}
            {currentTournaments.length === 0 && upcomingTournaments.length === 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>Your Tournaments</h2>
                  <Link href="/admin/tournaments"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: "#C9A84C" }}>
                    View all <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {tournaments.map((t) => <TournamentCard key={t.id} t={t} />)}
                </div>
              </div>
            )}

            {/* ── Past Tournaments ── */}
            {pastTournaments.length > 0 && (currentTournaments.length > 0 || upcomingTournaments.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold" style={{ color: "#8A8070" }}>Past Tournaments</h2>
                </div>
                <div className="space-y-3 opacity-70">
                  {pastTournaments.map((t) => <TournamentCard key={t.id} t={t} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentCard({ t, highlight }: { t: Tournament; highlight?: boolean }) {
  const statusCol = getTournamentStatusColor(t.status);
  const tRegs = t.registrations ?? [];
  const tPending = tRegs.filter((r) => r.status === "pending").length;
  const tApproved = tRegs.filter((r) => r.status === "approved").length;

  return (
    <div className="bg-white rounded-2xl overflow-hidden"
      style={{
        border: highlight ? "2px solid rgba(201,168,76,0.5)" : "1px solid rgba(232,224,208,0.8)",
        boxShadow: highlight ? "0 4px 20px rgba(201,168,76,0.15)" : "0 2px 12px rgba(26,51,24,0.05)",
      }}>
      <div className="flex">
        {t.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.bannerImage} alt="" className="w-28 flex-shrink-0 object-cover" style={{ minHeight: 110 }} />
        ) : (
          <div className="w-28 flex-shrink-0 flex items-center justify-center" style={{ background: "#1A3318", minHeight: 110 }}>
            <Trophy size={24} style={{ color: "#C9A84C" }} />
          </div>
        )}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base font-bold" style={{ color: "#1A3318" }}>{t.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: statusCol.bg, color: statusCol.text }}>
                  {getTournamentStatusLabel(t.status)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {t.city && <span className="flex items-center gap-1 text-xs" style={{ color: "#8A8070" }}><MapPin size={9} /> {t.city}</span>}
                {t.startDate && <span className="flex items-center gap-1 text-xs" style={{ color: "#8A8070" }}><Calendar size={9} /> {t.startDate}{t.endDate && t.endDate !== t.startDate ? ` – ${t.endDate}` : ""}</span>}
                {t.prize && <span className="text-xs font-bold" style={{ color: "#C9A84C" }}>{formatPrize(t.prize)}</span>}
              </div>
              <div className="flex gap-4 mt-2">
                <span className="text-xs" style={{ color: "#8A8070" }}>{t.categories.length} categories</span>
                <span className="text-xs" style={{ color: "#8A8070" }}>{tApproved} approved</span>
                {tPending > 0 && (
                  <span className="text-xs font-bold" style={{ color: "#D97706" }}>{tPending} pending</span>
                )}
              </div>
              {/* Category draw chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {t.categories.map((cat) => (
                  <Link key={cat.id} href={`/admin/tournaments/${t.id}/draw/${cat.id}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold hover:opacity-80"
                    style={cat.drawPublished
                      ? { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }
                      : { background: "#F8F4EE", color: "#8A8070", border: "1px solid rgba(232,224,208,0.8)" }}>
                    {cat.drawPublished ? <Globe size={8} /> : <Lock size={8} />}
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
            <Link href={`/admin/tournaments/${t.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
              style={{ background: "#1A3318", color: "white" }}>
              Manage <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
