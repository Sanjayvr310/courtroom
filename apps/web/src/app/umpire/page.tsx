"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Camera, ChevronRight, Activity, Clock, CheckCircle, Zap, Shield } from "lucide-react";
import { getAllMatchIds, getMatch, StoredMatch } from "@/lib/match-store";
import { getTournament } from "@/lib/store";

// ── Umpire Profile Store ──────────────────────────────────────────────────────

interface UmpireProfile {
  name: string;
  photo?: string;
  phone?: string;
  badge?: string;
}

function getProfile(): UmpireProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("courtroom_umpire_profile");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProfile(p: UmpireProfile) {
  localStorage.setItem("courtroom_umpire_profile", JSON.stringify(p));
  localStorage.setItem("courtroom_umpire_name", p.name);
}

// ── Status helpers ────────────────────────────────────────────────────────────

function statusOrder(s: string) {
  if (s === "GAME_IN_PROGRESS") return 0;
  if (s === "READY" || s === "SCHEDULED") return 1;
  return 2;
}

function isLive(m: StoredMatch) { return m.state.status === "GAME_IN_PROGRESS"; }
function isDone(m: StoredMatch) { return m.state.status === "MATCH_COMPLETED" || m.state.status === "FORFEITED"; }

// ── Match Card ────────────────────────────────────────────────────────────────

function MatchCard({ m, onClick }: { m: StoredMatch; onClick: () => void }) {
  const live = isLive(m);
  const done = isDone(m);
  const t1 = m.state.team1Name;
  const t2 = m.state.team2Name;
  const score1 = m.state.games[m.state.currentGame]?.team1 ?? 0;
  const score2 = m.state.games[m.state.currentGame]?.team2 ?? 0;
  const completedGames = m.state.games.filter(g => g.winner);
  const wins1 = completedGames.filter(g => g.winner === "team1").length;
  const wins2 = completedGames.filter(g => g.winner === "team2").length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all active:scale-[0.98]"
      style={{
        background: live
          ? "linear-gradient(135deg, rgba(212,224,74,0.1) 0%, rgba(45,90,39,0.15) 100%)"
          : done
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.06)",
        border: live
          ? "1.5px solid rgba(212,224,74,0.4)"
          : done
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18,
        padding: "14px 16px",
        opacity: done ? 0.65 : 1,
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {m.state.court && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
              style={{
                background: live ? "rgba(212,224,74,0.15)" : "rgba(255,255,255,0.08)",
                color: live ? "#D4E04A" : "rgba(255,255,255,0.5)",
              }}>
              {m.state.court}
            </span>
          )}
          {m.state.groupName && (
            <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
              {m.state.groupName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {live && (
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#D4E04A" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </span>
          )}
          {done && <CheckCircle size={13} style={{ color: "#6EE7B7" }} />}
          {!live && !done && (
            <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>Ready</span>
          )}
          <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)" }} />
        </div>
      </div>

      {/* Teams + scores */}
      <div className="space-y-1.5">
        {/* Team 1 */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold truncate" style={{ color: done && wins1 > wins2 ? "#D4E04A" : "white" }}>
              {t1.split(" / ")[0]}
            </div>
            {t1.includes(" / ") && (
              <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                & {t1.split(" / ")[1]}
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            {live ? (
              <span className="text-xl font-black tabular-nums" style={{ color: "#D4E04A" }}>{score1}</span>
            ) : done ? (
              <span className="text-base font-bold tabular-nums" style={{ color: wins1 > wins2 ? "#D4E04A" : "rgba(255,255,255,0.3)" }}>{wins1}</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.2)" }}>VS</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold truncate" style={{ color: done && wins2 > wins1 ? "#D4E04A" : "white" }}>
              {t2.split(" / ")[0]}
            </div>
            {t2.includes(" / ") && (
              <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                & {t2.split(" / ")[1]}
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            {live ? (
              <span className="text-xl font-black tabular-nums" style={{ color: "#D4E04A" }}>{score2}</span>
            ) : done ? (
              <span className="text-base font-bold tabular-nums" style={{ color: wins2 > wins1 ? "#D4E04A" : "rgba(255,255,255,0.3)" }}>{wins2}</span>
            ) : null}
          </div>
        </div>

        {/* Completed game scores */}
        {done && completedGames.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {completedGames.map((g, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-md font-semibold tabular-nums"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                {g.team1}–{g.team2}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Court Section ─────────────────────────────────────────────────────────────

function CourtSection({ court, matches, onMatchClick }: {
  court: string;
  matches: StoredMatch[];
  onMatchClick: (id: string) => void;
}) {
  const liveCount = matches.filter(isLive).length;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{
            background: liveCount > 0 ? "rgba(212,224,74,0.1)" : "rgba(255,255,255,0.05)",
            border: liveCount > 0 ? "1px solid rgba(212,224,74,0.2)" : "1px solid rgba(255,255,255,0.07)",
          }}>
          <span className="text-xs font-black uppercase tracking-widest"
            style={{ color: liveCount > 0 ? "#D4E04A" : "rgba(255,255,255,0.4)" }}>
            {court}
          </span>
          {liveCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
        </div>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
        <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.2)" }}>
          {matches.length} match{matches.length !== 1 ? "es" : ""}
        </span>
      </div>
      <div className="space-y-2">
        {matches.map(m => (
          <MatchCard key={m.state.matchId} m={m} onClick={() => onMatchClick(m.state.matchId)} />
        ))}
      </div>
    </div>
  );
}

// ── Main Umpire Home Page ─────────────────────────────────────────────────────

export default function UmpireHomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UmpireProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftBadge, setDraftBadge] = useState("");
  const [draftPhoto, setDraftPhoto] = useState<string | undefined>(undefined);
  const [myMatches, setMyMatches] = useState<StoredMatch[]>([]);
  const [allMatches, setAllMatches] = useState<StoredMatch[]>([]);
  const [tournamentNames, setTournamentNames] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"mine" | "all">("mine");
  const [selectedCourt, setSelectedCourt] = useState<string>("all");

  useEffect(() => {
    const p = getProfile();
    if (p) {
      setProfile(p);
      loadMatches(p.name);
    } else {
      setEditing(true);
    }
  }, []);

  function loadMatches(name: string) {
    const ids = getAllMatchIds();
    const all: StoredMatch[] = [];
    const tNames: Record<string, string> = {};
    for (const id of ids) {
      const m = getMatch(id);
      if (m) {
        all.push(m);
        if (m.state.tournamentId && !tNames[m.state.tournamentId]) {
          const t = getTournament(m.state.tournamentId);
          if (t) tNames[m.state.tournamentId] = t.name;
        }
      }
    }
    all.sort((a, b) => statusOrder(a.state.status) - statusOrder(b.state.status));
    setAllMatches(all);
    setTournamentNames(tNames);
    setMyMatches(all.filter(m =>
      !m.state.umpireName || m.state.umpireName.toLowerCase() === name.toLowerCase()
    ));
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDraftPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function startEdit() {
    setDraftName(profile?.name ?? "");
    setDraftPhone(profile?.phone ?? "");
    setDraftBadge(profile?.badge ?? "");
    setDraftPhoto(profile?.photo);
    setEditing(true);
  }

  function saveAndContinue() {
    if (!draftName.trim()) return;
    const p: UmpireProfile = {
      name: draftName.trim(),
      phone: draftPhone.trim() || undefined,
      badge: draftBadge.trim() || undefined,
      photo: draftPhoto,
    };
    saveProfile(p);
    setProfile(p);
    setEditing(false);
    loadMatches(p.name);
  }

  function groupByCourt(matches: StoredMatch[]): { court: string; matches: StoredMatch[] }[] {
    const map = new Map<string, StoredMatch[]>();
    for (const m of matches) {
      const court = m.state.court || "Unassigned";
      if (!map.has(court)) map.set(court, []);
      map.get(court)!.push(m);
    }
    const courts = Array.from(map.keys()).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""));
      const nb = parseInt(b.replace(/\D/g, ""));
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    return courts.map(c => ({ court: c, matches: map.get(c)! }));
  }

  const displayMatches = activeTab === "mine" ? myMatches : allMatches;
  const courtGroups = groupByCourt(displayMatches);

  const primaryTournamentId = allMatches[0]?.state.tournamentId;
  const primaryTournamentName = primaryTournamentId ? tournamentNames[primaryTournamentId] : null;

  const liveCount = displayMatches.filter(isLive).length;
  const readyCount = displayMatches.filter(m => m.state.status === "READY" || m.state.status === "SCHEDULED").length;
  const doneCount = displayMatches.filter(isDone).length;

  // ── Profile Setup Screen ──────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: "linear-gradient(160deg, #0A1A0A 0%, #0F2A0F 50%, #0A1A0A 100%)" }}>
        <div className="w-full max-w-sm">
          {/* Logo / brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: "rgba(212,224,74,0.1)", border: "1px solid rgba(212,224,74,0.2)" }}>
              <Shield size={26} style={{ color: "#D4E04A" }} />
            </div>
            <div className="text-[#D4E04A] text-xs font-bold uppercase tracking-widest mb-1">Courtroom</div>
            <h1 className="text-white text-2xl font-bold">{profile ? "Edit Profile" : "Umpire Setup"}</h1>
            <p className="text-white/40 text-sm mt-1">Your name appears on all match records</p>
          </div>

          {/* Photo */}
          <div className="flex flex-col items-center mb-6">
            <label className="cursor-pointer group relative">
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "2px dashed rgba(212,224,74,0.25)" }}>
                {draftPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draftPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={30} style={{ color: "rgba(212,224,74,0.35)" }} />
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "#D4E04A" }}>
                <Camera size={11} style={{ color: "#0A1A0A" }} />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            <div className="text-white/25 text-xs mt-2">Tap to add photo</div>
          </div>

          <div className="space-y-3 mb-6">
            <div>
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wide block mb-1.5">Full Name *</label>
              <input value={draftName} onChange={e => setDraftName(e.target.value)}
                placeholder="e.g. Sanjay Kumar" autoFocus
                className="w-full px-4 py-3.5 rounded-2xl text-white text-base focus:outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
            </div>
            <div>
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wide block mb-1.5">Phone (optional)</label>
              <input value={draftPhone} onChange={e => setDraftPhone(e.target.value)}
                placeholder="+91 98765 43210" type="tel"
                className="w-full px-4 py-3.5 rounded-2xl text-white text-sm focus:outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wide block mb-1.5">Badge / Title (optional)</label>
              <input value={draftBadge} onChange={e => setDraftBadge(e.target.value)}
                placeholder="e.g. Senior Umpire"
                className="w-full px-4 py-3.5 rounded-2xl text-white text-sm focus:outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>

          <button onClick={saveAndContinue} disabled={!draftName.trim()}
            className="w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-40 transition-all active:scale-95"
            style={{ background: "#D4E04A", color: "#0A1A0A" }}>
            {profile ? "Save Changes" : "Start Umpiring →"}
          </button>
          {profile && (
            <button onClick={() => setEditing(false)} className="w-full mt-3 py-3 text-sm text-white/30 hover:text-white/50">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-10"
      style={{ background: "linear-gradient(160deg, #0A1A0A 0%, #0D200D 60%, #0A1A0A 100%)" }}>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(180deg, #0A1A0A 0%, rgba(10,26,10,0) 100%)" }}>
        <div className="px-4 pt-6 pb-4">
          {/* Tournament name */}
          {primaryTournamentName && (
            <div className="text-center mb-4">
              <div className="text-[#D4E04A]/40 text-[10px] font-bold uppercase tracking-widest mb-0.5">Tournament</div>
              <div className="text-white font-bold text-sm">{primaryTournamentName}</div>
            </div>
          )}

          {/* Profile row */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={startEdit} className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden"
                style={{ border: "2px solid rgba(212,224,74,0.3)" }}>
                {profile?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: "rgba(212,224,74,0.08)" }}>
                    <User size={20} style={{ color: "rgba(212,224,74,0.5)" }} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "#D4E04A" }}>
                <Camera size={8} style={{ color: "#0A1A0A" }} />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">Umpire</div>
              <div className="text-white text-base font-bold truncate">{profile?.name}</div>
              {profile?.badge && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold mt-0.5"
                  style={{ background: "rgba(212,224,74,0.08)", color: "#D4E04A", border: "1px solid rgba(212,224,74,0.15)" }}>
                  ✦ {profile.badge}
                </div>
              )}
            </div>
            <button onClick={startEdit}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
              Edit
            </button>
          </div>

          {/* Stats row — 3 colored cards */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="rounded-2xl p-3 text-center"
              style={{ background: liveCount > 0 ? "rgba(212,224,74,0.08)" : "rgba(255,255,255,0.04)", border: liveCount > 0 ? "1px solid rgba(212,224,74,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                {liveCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                <div className="text-2xl font-black" style={{ color: liveCount > 0 ? "#D4E04A" : "rgba(255,255,255,0.3)" }}>{liveCount}</div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: liveCount > 0 ? "rgba(212,224,74,0.6)" : "rgba(255,255,255,0.2)" }}>Live</div>
            </div>
            <div className="rounded-2xl p-3 text-center"
              style={{ background: "rgba(147,197,253,0.06)", border: "1px solid rgba(147,197,253,0.12)" }}>
              <div className="text-2xl font-black mb-0.5" style={{ color: readyCount > 0 ? "#93C5FD" : "rgba(255,255,255,0.3)" }}>{readyCount}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(147,197,253,0.5)" }}>Ready</div>
            </div>
            <div className="rounded-2xl p-3 text-center"
              style={{ background: "rgba(110,231,183,0.06)", border: "1px solid rgba(110,231,183,0.12)" }}>
              <div className="text-2xl font-black mb-0.5" style={{ color: doneCount > 0 ? "#6EE7B7" : "rgba(255,255,255,0.3)" }}>{doneCount}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(110,231,183,0.5)" }}>Done</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl mb-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { key: "mine" as const, label: "My Matches", count: myMatches.length },
              { key: "all" as const, label: "All Matches", count: allMatches.length },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={activeTab === tab.key
                  ? { background: "#D4E04A", color: "#0A1A0A" }
                  : { color: "rgba(255,255,255,0.35)" }}>
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: activeTab === tab.key ? "rgba(10,26,10,0.2)" : "rgba(255,255,255,0.08)",
                      color: activeTab === tab.key ? "#0A1A0A" : "rgba(255,255,255,0.3)",
                    }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Court filter — elegant pill buttons */}
          {courtGroups.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCourt("all")}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={selectedCourt === "all"
                  ? { background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                All
              </button>
              {courtGroups.map(({ court, matches: cm }) => {
                const hasLive = cm.some(isLive);
                const active = selectedCourt === court;
                return (
                  <button
                    key={court}
                    onClick={() => setSelectedCourt(court)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    style={active
                      ? { background: hasLive ? "rgba(212,224,74,0.2)" : "rgba(255,255,255,0.12)", color: hasLive ? "#D4E04A" : "white", border: `1px solid ${hasLive ? "rgba(212,224,74,0.4)" : "rgba(255,255,255,0.2)"}` }
                      : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {hasLive && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />}
                    {court}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Match List ── */}
      <div className="px-4 pt-2">
        {displayMatches.length === 0 ? (
          <div className="rounded-2xl p-10 text-center mt-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.07)" }}>
            <Activity size={28} style={{ color: "rgba(212,224,74,0.2)", margin: "0 auto 10px" }} />
            <div className="text-white/25 text-sm">
              {activeTab === "mine" ? "No matches assigned to you yet" : "No matches scheduled yet"}
            </div>
            <div className="text-white/15 text-xs mt-1">
              {activeTab === "mine" ? "Admin assigns umpires when scheduling" : "Create matches from the admin panel"}
            </div>
            {activeTab === "mine" && (
              <button onClick={() => setActiveTab("all")}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(212,224,74,0.08)", color: "#D4E04A", border: "1px solid rgba(212,224,74,0.15)" }}>
                Browse all matches
              </button>
            )}
          </div>
        ) : (
          (selectedCourt === "all" ? courtGroups : courtGroups.filter(g => g.court === selectedCourt))
            .map(({ court, matches }) => (
              <CourtSection
                key={court}
                court={court}
                matches={matches}
                onMatchClick={(id) => router.push(`/umpire/${id}`)}
              />
            ))
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="px-4 mt-4">
        <div className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-2">Quick Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => router.push("/umpire/new")}
            className="rounded-2xl p-4 flex flex-col items-start gap-2 active:scale-95 transition-all"
            style={{ background: "rgba(147,197,253,0.06)", border: "1px solid rgba(147,197,253,0.12)" }}>
            <Clock size={18} style={{ color: "#93C5FD" }} />
            <div className="text-white text-sm font-bold">New Match</div>
            <div className="text-white/25 text-xs">Create manually</div>
          </button>
          <button onClick={() => router.push("/live")}
            className="rounded-2xl p-4 flex flex-col items-start gap-2 active:scale-95 transition-all"
            style={{ background: "rgba(212,224,74,0.06)", border: "1px solid rgba(212,224,74,0.12)" }}>
            <Zap size={18} style={{ color: "#D4E04A" }} />
            <div className="text-white text-sm font-bold">Live Scores</div>
            <div className="text-white/25 text-xs">Public view</div>
          </button>
        </div>
      </div>
    </div>
  );
}
