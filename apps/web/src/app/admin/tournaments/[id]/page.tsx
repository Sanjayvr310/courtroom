"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft, Trophy, Users, Globe, Lock, CheckCircle, XCircle,
  Clock, ChevronRight, ToggleLeft, ToggleRight, Edit2, Plus, UserCheck, Trash2, Camera,
} from "lucide-react";
import {
  getTournament, saveTournament, updateRegistrationStatus,
  Tournament, TournamentCategory, Registration, RegistrationStatus,
  UmpireEntry, createId,
  getTournamentStatusLabel, getTournamentStatusColor, formatPrize,
} from "@/lib/store";

// ─── Registration Row ─────────────────────────────────────────────────────────
function RegistrationRow({
  reg, catName, onStatus,
}: {
  reg: Registration;
  catName: string;
  onStatus: (id: string, status: RegistrationStatus) => void;
}) {
  const statusStyle: Record<RegistrationStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: "#FEF3C7", text: "#D97706", label: "Pending" },
    approved: { bg: "#F0FDF4", text: "#16A34A", label: "Approved" },
    rejected: { bg: "#FEF2F2", text: "#DC2626", label: "Rejected" },
    waitlisted: { bg: "#F3F4F6", text: "#6B7280", label: "Waitlisted" },
  };
  const s = statusStyle[reg.status];
  const isDoubles = !!reg.player2Name;

  return (
    <tr className="hover:bg-[#F8F4EE] transition-colors" style={{ borderBottom: "1px solid rgba(232,224,208,0.5)" }}>
      {/* Player names */}
      <td className="px-5 py-3">
        <div className="text-sm font-semibold" style={{ color: "#1A3318" }}>{reg.player1Name}</div>
        {isDoubles && <div className="text-xs mt-0.5" style={{ color: "#8A8070" }}>+ {reg.player2Name}</div>}
        <div className="text-[10px] mt-0.5 font-medium" style={{ color: isDoubles ? "#C9A84C" : "#8A8070" }}>
          {isDoubles ? "Doubles" : "Singles"}
        </div>
      </td>
      {/* Category */}
      <td className="px-4 py-3 text-xs" style={{ color: "#8A8070" }}>{catName}</td>
      {/* Contact */}
      <td className="px-4 py-3">
        <div className="text-xs" style={{ color: "#1A3318" }}>{reg.player1Email}</div>
        <div className="text-xs mt-0.5" style={{ color: "#8A8070" }}>{reg.player1Phone}</div>
        {isDoubles && reg.player2Phone && (
          <div className="text-xs mt-0.5" style={{ color: "#8A8070" }}>{reg.player2Phone}</div>
        )}
      </td>
      {/* DUPR — Player 1 */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase" style={{ color: "#8A8070" }}>P1</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: "#C9A84C" }}>
              {reg.player1Rating ? reg.player1Rating.toFixed(3) : "—"}
            </span>
            {reg.player1DuprId && (
              <span className="text-[10px] font-mono px-1 rounded" style={{ background: "#F8F4EE", color: "#8A8070" }}>
                {reg.player1DuprId}
              </span>
            )}
          </div>
          {isDoubles && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase" style={{ color: "#8A8070" }}>P2</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: "#C9A84C" }}>
                {reg.player2Rating ? reg.player2Rating.toFixed(3) : "—"}
              </span>
              {reg.player2DuprId && (
                <span className="text-[10px] font-mono px-1 rounded" style={{ background: "#F8F4EE", color: "#8A8070" }}>
                  {reg.player2DuprId}
                </span>
              )}
            </div>
          )}
          {isDoubles && reg.player1Rating && reg.player2Rating && (
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#1A3318" }}>
              Avg: {((reg.player1Rating + reg.player2Rating) / 2).toFixed(3)}
            </div>
          )}
        </div>
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: s.bg, color: s.text }}>{s.label}</span>
      </td>
      {/* Date */}
      <td className="px-4 py-3 text-xs" style={{ color: "#8A8070" }}>{new Date(reg.submittedAt).toLocaleDateString()}</td>
      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {reg.status !== "approved" && (
            <button onClick={() => onStatus(reg.id, "approved")}
              className="p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="Approve" style={{ color: "#16A34A" }}>
              <CheckCircle size={15} />
            </button>
          )}
          {reg.status !== "rejected" && (
            <button onClick={() => onStatus(reg.id, "rejected")}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Reject" style={{ color: "#DC2626" }}>
              <XCircle size={15} />
            </button>
          )}
          {reg.status !== "waitlisted" && (
            <button onClick={() => onStatus(reg.id, "waitlisted")}
              className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors" title="Waitlist" style={{ color: "#6B7280" }}>
              <Clock size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminTournamentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "registrations" | "umpires">("overview");
  const [regFilter, setRegFilter] = useState<"all" | RegistrationStatus>("all");
  const [regCatFilter, setRegCatFilter] = useState<string>("all");

  // Umpire management state
  const [umpireName, setUmpireName] = useState("");
  const [umpirePhone, setUmpirePhone] = useState("");
  const [umpireBadge, setUmpireBadge] = useState("");
  const [umpirePhoto, setUmpirePhoto] = useState<string | undefined>(undefined);
  const [addingUmpire, setAddingUmpire] = useState(false);

  useEffect(() => {
    const t = getTournament(id);
    setTournament(t);
  }, [id]);

  function reload() {
    setTournament(getTournament(id));
  }

  function toggleRegistration(cat: TournamentCategory) {
    if (!tournament) return;
    const updated: Tournament = {
      ...tournament,
      categories: tournament.categories.map((c) =>
        c.id === cat.id ? { ...c, registrationOpen: !c.registrationOpen } : c
      ),
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleRegStatus(regId: string, status: RegistrationStatus) {
    if (!tournament) return;
    updateRegistrationStatus(tournament.id, regId, status);
    reload();
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F4EE" }}>
        <p style={{ color: "#8A8070" }}>Tournament not found.</p>
      </div>
    );
  }

  const registrations = tournament.registrations ?? [];
  const filteredRegs = registrations.filter((r) => {
    if (regFilter !== "all" && r.status !== regFilter) return false;
    if (regCatFilter !== "all" && r.categoryId !== regCatFilter) return false;
    return true;
  });

  const statusCol = getTournamentStatusColor(tournament.status);
  const pendingCount = registrations.filter((r) => r.status === "pending").length;
  const approvedCount = registrations.filter((r) => r.status === "approved").length;

  return (
    <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A3318 0%, #2D5A27 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/tournaments" className="text-white/50 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "rgba(201,168,76,0.6)" }}>
                Admin · Tournaments
              </div>
              <h1 className="font-display text-2xl font-bold text-white truncate">{tournament.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: statusCol.bg, color: statusCol.text }}>
                  {getTournamentStatusLabel(tournament.status)}
                </span>
                {tournament.city && <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{tournament.city}</span>}
                {tournament.startDate && <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{tournament.startDate}</span>}
                {tournament.prize && <span className="text-xs font-bold" style={{ color: "#C9A84C" }}>{formatPrize(tournament.prize)}</span>}
              </div>
            </div>
            <Link href={`/admin/tournaments`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
              <Edit2 size={12} /> Edit
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { label: "Categories", value: tournament.categories.length },
              { label: "Total Registrations", value: registrations.length },
              { label: "Approved", value: approvedCount },
              { label: "Pending Review", value: pendingCount },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="font-display text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {(["overview", "categories", "registrations", "umpires"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-5 py-2.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px"
                style={activeTab === tab ? { borderColor: "#C9A84C", color: "#C9A84C" } : { borderColor: "transparent", color: "rgba(255,255,255,0.45)" }}>
                {tab}
                {tab === "registrations" && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#D97706", color: "white" }}>
                    {pendingCount}
                  </span>
                )}
                {tab === "umpires" && (tournament.umpires?.length ?? 0) > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,168,76,0.3)", color: "#C9A84C" }}>
                    {tournament.umpires!.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Tournament info */}
            <div className="lg:col-span-2 space-y-4">
              {tournament.bannerImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tournament.bannerImage} alt="" className="w-full h-48 object-cover rounded-2xl" />
              )}
              <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <h2 className="font-display text-lg font-bold mb-4" style={{ color: "#1A3318" }}>Tournament Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: "Venue", value: tournament.venue },
                    { label: "City", value: tournament.city },
                    { label: "Start Date", value: tournament.startDate },
                    { label: "End Date", value: tournament.endDate },
                    { label: "Reg. Deadline", value: tournament.registrationDeadline },
                    { label: "Prize Pool", value: formatPrize(tournament.prize) },
                    { label: "Contact Email", value: tournament.contactEmail },
                    { label: "Contact Phone", value: tournament.contactPhone },
                  ].filter((f) => f.value).map((f) => (
                    <div key={f.label}>
                      <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8A8070" }}>{f.label}</div>
                      <div style={{ color: "#1A3318" }}>{f.value}</div>
                    </div>
                  ))}
                </div>
                {tournament.description && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(232,224,208,0.8)" }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Description</div>
                    <p className="text-sm" style={{ color: "#1A3318" }}>{tournament.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <h3 className="font-display font-bold mb-4" style={{ color: "#1A3318" }}>Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => setActiveTab("categories")}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-[#F8F4EE]"
                    style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318" }}>
                    <span className="flex items-center gap-2"><Trophy size={14} /> Manage Categories</span>
                    <ChevronRight size={14} />
                  </button>
                  <button onClick={() => setActiveTab("registrations")}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-[#F8F4EE]"
                    style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318" }}>
                    <span className="flex items-center gap-2">
                      <Users size={14} /> View Registrations
                      {pendingCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#FEF3C7", color: "#D97706" }}>{pendingCount} pending</span>}
                    </span>
                    <ChevronRight size={14} />
                  </button>
                  <Link href={`/tournaments/${tournament.id}`}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-[#F8F4EE]"
                    style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318" }}>
                    <span className="flex items-center gap-2"><Globe size={14} /> Public View</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Category draw status */}
              <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <h3 className="font-display font-bold mb-3" style={{ color: "#1A3318" }}>Draw Status</h3>
                <div className="space-y-2">
                  {tournament.categories.map((cat) => (
                    <Link key={cat.id} href={`/admin/tournaments/${tournament.id}/draw/${cat.id}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-[#F8F4EE]"
                      style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "#1A3318" }}>{cat.name}</div>
                        <div className="text-xs" style={{ color: "#8A8070" }}>
                          {cat.drawPublished ? "Draw published" : "Draw pending"}
                        </div>
                      </div>
                      {cat.drawPublished
                        ? <Globe size={14} style={{ color: "#16A34A" }} />
                        : <Lock size={14} style={{ color: "#8A8070" }} />}
                    </Link>
                  ))}
                  {tournament.categories.length === 0 && (
                    <p className="text-xs text-center py-2" style={{ color: "#8A8070" }}>No categories yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Categories Tab ── */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>Categories</h2>
              <Link href={`/admin/tournaments`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(201,168,76,0.12)", color: "#A8872E" }}>
                <Plus size={12} /> Add Category (via Edit)
              </Link>
            </div>
            {tournament.categories.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <Trophy size={32} style={{ color: "#C9A84C", margin: "0 auto 12px" }} />
                <p className="text-sm" style={{ color: "#8A8070" }}>No categories. Edit the tournament to add categories.</p>
              </div>
            ) : (
              tournament.categories.map((cat) => {
                const catRegs = registrations.filter((r) => r.categoryId === cat.id);
                const approvedCatRegs = catRegs.filter((r) => r.status === "approved").length;
                return (
                  <div key={cat.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                    <div className="px-6 py-4 flex items-center justify-between" style={{ background: "#1A3318" }}>
                      <div>
                        <h3 className="font-display font-bold text-white">{cat.name}</h3>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                          {cat.scoringFormat}{cat.entryFee ? ` · ₹${cat.entryFee} entry` : ""}{cat.maxTeams ? ` · Max ${cat.maxTeams} teams` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {cat.drawPublished
                          ? <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: "#F0FDF4", color: "#16A34A" }}><Globe size={10} /> Draw Live</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}><Lock size={10} /> Draw Pending</span>
                        }
                      </div>
                    </div>
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="font-display text-2xl font-bold" style={{ color: "#1A3318" }}>{catRegs.length}</div>
                          <div className="text-xs" style={{ color: "#8A8070" }}>Total Registrations</div>
                        </div>
                        <div className="text-center">
                          <div className="font-display text-2xl font-bold" style={{ color: "#16A34A" }}>{approvedCatRegs}</div>
                          <div className="text-xs" style={{ color: "#8A8070" }}>Approved</div>
                        </div>
                        <div className="text-center">
                          <div className="font-display text-2xl font-bold" style={{ color: "#D97706" }}>{catRegs.filter((r) => r.status === "pending").length}</div>
                          <div className="text-xs" style={{ color: "#8A8070" }}>Pending</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                         {/* Registration toggle */}
                         <button onClick={() => toggleRegistration(cat)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                          style={cat.registrationOpen
                            ? { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }
                            : { background: "#F8F4EE", color: "#8A8070", border: "1px solid rgba(232,224,208,0.8)" }}>
                          {cat.registrationOpen ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          Registration {cat.registrationOpen ? "Open" : "Closed"}
                        </button>
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/tournaments/${tournament.id}/schedule/${cat.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                            style={{ background: "rgba(201,168,76,0.12)", color: "#A8872E", border: "1px solid rgba(201,168,76,0.2)" }}>
                            Schedule
                          </Link>
                          <Link href={`/admin/tournaments/${tournament.id}/draw/${cat.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                            style={{ background: "#1A3318", color: "white" }}>
                            {cat.drawPublished ? "View Draw" : "Generate Draw"} <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>

                      {/* ── Standings Table ── */}
                      {cat.standings && cat.standings.length > 0 && (
                        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(232,224,208,0.6)" }}>
                          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#8A8070" }}>
                            Pool Standings
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr style={{ borderBottom: "1px solid rgba(232,224,208,0.8)" }}>
                                  <th className="text-left py-1.5 px-2 font-semibold" style={{ color: "#8A8070" }}>#</th>
                                  <th className="text-left py-1.5 px-2 font-semibold" style={{ color: "#8A8070" }}>Player</th>
                                  <th className="text-center py-1.5 px-2 font-semibold" style={{ color: "#8A8070" }}>P</th>
                                  <th className="text-center py-1.5 px-2 font-semibold" style={{ color: "#8A8070" }}>W</th>
                                  <th className="text-center py-1.5 px-2 font-semibold" style={{ color: "#8A8070" }}>L</th>
                                  <th className="text-center py-1.5 px-2 font-semibold" style={{ color: "#8A8070" }}>GW</th>
                                  <th className="text-center py-1.5 px-2 font-semibold" style={{ color: "#8A8070" }}>GL</th>
                                  <th className="text-center py-1.5 px-2 font-semibold" style={{ color: "#8A8070" }}>Pts</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cat.standings.map((s, idx) => (
                                  <tr key={s.registrationId}
                                    className="hover:bg-[#F8F4EE] transition-colors"
                                    style={{ borderBottom: "1px solid rgba(232,224,208,0.4)" }}>
                                    <td className="py-1.5 px-2 font-bold" style={{ color: idx === 0 ? "#C9A84C" : "#8A8070" }}>
                                      {idx + 1}
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <div className="font-semibold" style={{ color: "#1A3318" }}>{s.player1Name}</div>
                                      {s.player2Name && <div className="text-[10px]" style={{ color: "#8A8070" }}>& {s.player2Name}</div>}
                                    </td>
                                    <td className="py-1.5 px-2 text-center" style={{ color: "#1A3318" }}>{s.played}</td>
                                    <td className="py-1.5 px-2 text-center font-semibold" style={{ color: "#16A34A" }}>{s.won}</td>
                                    <td className="py-1.5 px-2 text-center" style={{ color: "#DC2626" }}>{s.lost}</td>
                                    <td className="py-1.5 px-2 text-center" style={{ color: "#1A3318" }}>{s.gamesWon}</td>
                                    <td className="py-1.5 px-2 text-center" style={{ color: "#1A3318" }}>{s.gamesLost}</td>
                                    <td className="py-1.5 px-2 text-center font-bold" style={{ color: "#C9A84C" }}>{s.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Umpires Tab ── */}
        {activeTab === "umpires" && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>Umpire Roster</h2>
                <p className="text-sm mt-0.5" style={{ color: "#8A8070" }}>
                  Add umpires to this tournament. They can be assigned to matches during scheduling.
                </p>
              </div>
              <button
                onClick={() => setAddingUmpire(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: "#1A3318", color: "white" }}>
                <Plus size={14} /> Add Umpire
              </button>
            </div>

            {/* Add Umpire Form */}
            {addingUmpire && (
              <div className="bg-white rounded-2xl p-6" style={{ border: "2px solid rgba(201,168,76,0.4)" }}>
                <h3 className="font-display font-bold mb-4" style={{ color: "#1A3318" }}>New Umpire</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Photo upload */}
                  <div className="col-span-2 flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: "#F8F4EE", border: "2px dashed rgba(201,168,76,0.4)" }}>
                      {umpirePhoto
                        ? <img src={umpirePhoto} alt="" className="w-full h-full object-cover" />
                        : <Camera size={20} style={{ color: "#C9A84C" }} />}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Photo (optional)</label>
                      <input type="file" accept="image/*" className="text-xs"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setUmpirePhoto(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Name *</label>
                    <input
                      value={umpireName}
                      onChange={(e) => setUmpireName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Phone</label>
                    <input
                      value={umpirePhone}
                      onChange={(e) => setUmpirePhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318" }} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Badge / Title</label>
                    <input
                      value={umpireBadge}
                      onChange={(e) => setUmpireBadge(e.target.value)}
                      placeholder="e.g. Certified Umpire, Head Umpire, Referee"
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318" }} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      if (!umpireName.trim()) return;
                      const newUmpire: UmpireEntry = {
                        id: createId(),
                        name: umpireName.trim(),
                        phone: umpirePhone.trim() || undefined,
                        badge: umpireBadge.trim() || undefined,
                        photo: umpirePhoto,
                      };
                      const updated: Tournament = {
                        ...tournament,
                        umpires: [...(tournament.umpires ?? []), newUmpire],
                      };
                      saveTournament(updated);
                      setTournament(updated);
                      setUmpireName(""); setUmpirePhone(""); setUmpireBadge(""); setUmpirePhoto(undefined);
                      setAddingUmpire(false);
                    }}
                    disabled={!umpireName.trim()}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
                    style={{ background: "#C9A84C", color: "#1A3318" }}>
                    Add Umpire
                  </button>
                  <button
                    onClick={() => { setAddingUmpire(false); setUmpireName(""); setUmpirePhone(""); setUmpireBadge(""); setUmpirePhoto(undefined); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#8A8070" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Umpire List */}
            {(tournament.umpires ?? []).length === 0 && !addingUmpire ? (
              <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <UserCheck size={32} style={{ color: "#C9A84C", margin: "0 auto 12px" }} />
                <p className="text-sm font-semibold mb-1" style={{ color: "#1A3318" }}>No umpires added yet</p>
                <p className="text-xs" style={{ color: "#8A8070" }}>Add umpires to assign them to matches during scheduling.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#F8F4EE", borderBottom: "1px solid rgba(232,224,208,0.8)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>
                    {(tournament.umpires ?? []).length} Umpire{(tournament.umpires ?? []).length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(232,224,208,0.5)" }}>
                  {(tournament.umpires ?? []).map((u) => (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ background: "#F8F4EE", border: "2px solid rgba(201,168,76,0.3)" }}>
                        {u.photo
                          ? <img src={u.photo} alt={u.name} className="w-full h-full object-cover" />
                          : <span className="text-lg font-bold" style={{ color: "#C9A84C" }}>{u.name[0]?.toUpperCase()}</span>}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: "#1A3318" }}>{u.name}</div>
                        {u.badge && <div className="text-xs mt-0.5 font-medium" style={{ color: "#C9A84C" }}>{u.badge}</div>}
                        {u.phone && <div className="text-xs mt-0.5" style={{ color: "#8A8070" }}>{u.phone}</div>}
                      </div>
                      {/* Delete */}
                      <button
                        onClick={() => {
                          const updated: Tournament = {
                            ...tournament,
                            umpires: (tournament.umpires ?? []).filter((x) => x.id !== u.id),
                          };
                          saveTournament(updated);
                          setTournament(updated);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: "#DC2626" }}
                        title="Remove umpire">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Registrations Tab ── */}
        {activeTab === "registrations" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>
                Registrations ({filteredRegs.length})
              </h2>
              <div className="flex gap-2 flex-wrap">
                {/* Category filter */}
                <select value={regCatFilter} onChange={(e) => setRegCatFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none"
                  style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "white" }}>
                  <option value="all">All Categories</option>
                  {tournament.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {/* Status filter */}
                {(["all", "pending", "approved", "rejected", "waitlisted"] as const).map((f) => (
                  <button key={f} onClick={() => setRegFilter(f)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize"
                    style={regFilter === f ? { background: "#1A3318", color: "white" } : { background: "white", color: "#8A8070", border: "1px solid rgba(232,224,208,0.8)" }}>
                    {f === "all" ? "All" : f}
                    {f === "pending" && pendingCount > 0 && ` (${pendingCount})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredRegs.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <Users size={32} style={{ color: "#C9A84C", margin: "0 auto 12px" }} />
                <p className="text-sm" style={{ color: "#8A8070" }}>
                  {registrations.length === 0 ? "No registrations yet." : "No registrations match the current filter."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(232,224,208,0.8)", background: "#F8F4EE" }}>
                        {["Player(s)", "Category", "Contact", "DUPR", "Status", "Submitted", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegs.map((reg) => {
                        const cat = tournament.categories.find((c) => c.id === reg.categoryId);
                        return (
                          <RegistrationRow
                            key={reg.id}
                            reg={reg}
                            catName={cat?.name ?? "Unknown"}
                            onStatus={handleRegStatus}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
