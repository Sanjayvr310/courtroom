"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Activity, Clock, CheckCircle, Zap } from "lucide-react";
import { getAllMatchIds, getMatch, StoredMatch } from "@/lib/match-store";

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
  const [allMatches, setAllMatches] = useState<StoredMatch[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>("all");

  useEffect(() => {
    const ids = getAllMatchIds();
    const all: StoredMatch[] = [];
    for (const id of ids) {
      const m = getMatch(id);
      if (m) all.push(m);
    }
    all.sort((a, b) => statusOrder(a.state.status) - statusOrder(b.state.status));
    setAllMatches(all);
  }, []);

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

  const courtGroups = groupByCourt(allMatches);
  const liveCount = allMatches.filter(isLive).length;

  return (
    <div className="min-h-screen pb-10" style={{ background: "#0A1A0A" }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: "#0A1A0A", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white text-xl font-bold">Umpire Console</h1>
            <div className="text-white/30 text-xs mt-0.5">
              {liveCount > 0
                ? <span style={{ color: "#D4E04A" }}>● {liveCount} live · {allMatches.length} total</span>
                : `${allMatches.length} match${allMatches.length !== 1 ? "es" : ""}`}
            </div>
          </div>
        </div>
        {courtGroups.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setSelectedCourt("all")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0"
              style={selectedCourt === "all"
                ? { background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
              All
            </button>
            {courtGroups.map(({ court, matches: cm }) => {
              const hasLive = cm.some(isLive);
              const active = selectedCourt === court;
              return (
                <button key={court} onClick={() => setSelectedCourt(court)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
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
      {/* ── Match List ── */}
      <div className="px-4 pt-4">
        {allMatches.length === 0 ? (
          <div className="rounded-2xl p-10 text-center mt-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.07)" }}>
            <Activity size={28} style={{ color: "rgba(212,224,74,0.2)", margin: "0 auto 10px" }} />
            <div className="text-white/25 text-sm">No matches scheduled yet</div>
            <div className="text-white/15 text-xs mt-1">Create matches from the admin panel</div>
          </div>
        ) : (
          (selectedCourt === "all" ? courtGroups : courtGroups.filter(g => g.court === selectedCourt))
            .map(({ court, matches }) => (
              <CourtSection key={court} court={court} matches={matches}
                onMatchClick={(id) => router.push(`/umpire/${id}`)} />
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
