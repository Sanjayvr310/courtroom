"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RotateCcw, Clock, AlertCircle, ChevronLeft, Pause, Play,
  Flag, AlertTriangle, CheckCircle, Activity, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";
import {
  getMatch, saveMatch, createNewMatch, parseRulesFromFormat,
  applyPoint, applySideOut, applyUndoLastPoint, applyStartMatch, applyStartNextGame,
  applyTimeout, applyPauseMatch, applyResumeMatch, applyForfeit, applyDispute,
  applySetServingTeam, canUndo, getServingCallout, formatMatchScore,
  StoredMatch, LiveMatchState, ScoreEvent, getAllMatchIds,
} from "@/lib/match-store";
import { getTournaments, recomputeStandings } from "@/lib/store";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Confirmation Modal ────────────────────────────────────────────────────────

function ConfirmModal({
  title, message, confirmLabel, danger, onConfirm, onCancel, requireReason,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  requireReason?: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: "#0F2010", border: "1px solid rgba(255,255,255,0.12)" }}>
        <div className="text-center">
          {danger && <AlertTriangle size={32} className="mx-auto mb-2" style={{ color: "#EF4444" }} />}
          <div className="text-white font-bold text-lg">{title}</div>
          <div className="text-white/50 text-sm mt-1">{message}</div>
        </div>
        {requireReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason (required)..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-sm text-white bg-white/10 border border-white/20 focus:outline-none resize-none"
          />
        )}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(requireReason ? reason : undefined)}
            disabled={requireReason && !reason.trim()}
            className="flex-1 py-3 rounded-2xl text-sm font-bold disabled:opacity-40"
            style={{ background: danger ? "#EF4444" : "#D4E04A", color: danger ? "white" : "#0F2010" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Serving Selector ──────────────────────────────────────────────────────────

function ServingSelector({ state, umpireName, onUpdate }: {
  state: LiveMatchState;
  umpireName: string;
  onUpdate: (stored: StoredMatch) => void;
}) {
  const stored = getMatch(state.matchId);
  if (!stored) return null;

  const t1Players = state.team1Players ?? [state.team1Name];
  const t2Players = state.team2Players ?? [state.team2Name];

  return (
    <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(212,224,74,0.06)", border: "1px solid rgba(212,224,74,0.15)" }}>
      <div className="text-[#D4E04A]/60 text-[10px] font-semibold uppercase tracking-wide text-center">Change Server</div>
      <div className="space-y-1">
        <div className="text-white/30 text-[10px] uppercase tracking-wide px-1">{state.team1Name.split(" / ")[0]}</div>
        {t1Players.map((player, idx) => {
          const isActive = state.servingTeam === "team1" && state.servingPlayerIndex === idx;
          return (
            <button key={idx}
              onClick={() => {
                const updated = applySetServingTeam(stored, "team1", idx as 0 | 1, umpireName, false);
                saveMatch(updated);
                onUpdate(updated);
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 text-left flex items-center justify-between"
              style={isActive
                ? { background: "#2D5A27", color: "white", border: "1.5px solid #D4E04A" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span>{player}</span>
              {isActive && <span className="text-[#D4E04A] text-[10px]">▶ serving</span>}
            </button>
          );
        })}
      </div>
      <div className="space-y-1">
        <div className="text-white/30 text-[10px] uppercase tracking-wide px-1">{state.team2Name.split(" / ")[0]}</div>
        {t2Players.map((player, idx) => {
          const isActive = state.servingTeam === "team2" && state.servingPlayerIndex === idx;
          return (
            <button key={idx}
              onClick={() => {
                const updated = applySetServingTeam(stored, "team2", idx as 0 | 1, umpireName, false);
                saveMatch(updated);
                onUpdate(updated);
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 text-left flex items-center justify-between"
              style={isActive
                ? { background: "#1A2744", color: "white", border: "1.5px solid #D4E04A" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span>{player}</span>
              {isActive && <span className="text-[#D4E04A] text-[10px]">◀ serving</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

function AuditLog({ events, state }: { events: ScoreEvent[]; state: LiveMatchState }) {
  const [expanded, setExpanded] = useState(false);
  const recent = [...events].reverse().slice(0, expanded ? 50 : 8);

  const eventLabel: Record<string, string> = {
    MATCH_STARTED: "Match started",
    POINT_SCORED: "Point scored",
    POINT_UNDONE: "Point undone",
    GAME_STARTED: "Game started",
    GAME_COMPLETED: "Game completed",
    TIMEOUT_STARTED: "Timeout called",
    TIMEOUT_COMPLETED: "Timeout ended",
    MATCH_PAUSED: "Match paused",
    MATCH_RESUMED: "Match resumed",
    MATCH_COMPLETED: "Match completed",
    MATCH_FORFEITED: "Match forfeited",
    MATCH_DISPUTED: "Match disputed",
    MATCH_CORRECTED: "Correction made",
    SIDE_CHANGED: "Sides changed",
  };

  return (
    <div className="mx-4 mb-6">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full mb-2">
        <div className="text-white/25 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <Activity size={11} /> Audit Log ({events.length})
        </div>
        {expanded ? <ChevronUp size={12} style={{ color: "rgba(255,255,255,0.25)" }} /> : <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.25)" }} />}
      </button>
      <div className="space-y-1">
        {recent.map((e) => {
          const isUndo = e.isReversal;
          const isPoint = e.eventType === "POINT_SCORED";
          const team = e.metadata?.team as string | undefined;
          const teamName = team === "team1" ? state.team1Name : team === "team2" ? state.team2Name : "";
          return (
            <div key={e.eventId} className="flex items-center justify-between text-xs py-1"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUndo ? "bg-orange-400" : isPoint ? "bg-[#D4E04A]" : "bg-white/15"}`} />
                <span style={{ color: isUndo ? "#FB923C" : isPoint ? "#D4E04A" : "rgba(255,255,255,0.35)" }}>
                  {eventLabel[e.eventType] ?? e.eventType}
                  {isPoint && teamName ? ` → ${teamName.split(" / ")[0]}` : ""}
                </span>
              </div>
              <span className="text-white/20 tabular-nums">{formatTimestamp(e.timestamp)}</span>
            </div>
          );
        })}
      </div>
      {events.length > 8 && (
        <button onClick={() => setExpanded(!expanded)} className="text-white/20 text-xs mt-1 hover:text-white/40">
          {expanded ? "Show less" : `Show all ${events.length} events`}
        </button>
      )}
    </div>
  );
}

// ── Ready Panel (match format selector + start) ───────────────────────────────

const FORMAT_PRESETS = [
  { label: "Best of 1 · to 11", bestOf: 1 as const, pointsToWin: 11 as const },
  { label: "Best of 1 · to 15", bestOf: 1 as const, pointsToWin: 15 as const },
  { label: "Best of 1 · to 21", bestOf: 1 as const, pointsToWin: 21 as const },
  { label: "Best of 3 · to 11", bestOf: 3 as const, pointsToWin: 11 as const },
  { label: "Best of 3 · to 15", bestOf: 3 as const, pointsToWin: 15 as const },
  { label: "Best of 5 · to 11", bestOf: 5 as const, pointsToWin: 11 as const },
];

function ReadyPanel({ stored, state, umpireName, onUpdate, onConfirm }: {
  stored: StoredMatch;
  state: LiveMatchState;
  umpireName: string;
  onUpdate: (s: StoredMatch) => void;
  onConfirm: (c: { title: string; message: string; confirmLabel: string; danger?: boolean; requireReason?: boolean; onConfirm: (r?: string) => void } | null) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    `${state.rules.bestOf}-${state.rules.pointsToWin}`
  );
  const [timeoutsPerTeam, setTimeoutsPerTeam] = useState(state.rules.maxTimeoutsPerTeam);

  function applyPresetAndStart() {
    const preset = FORMAT_PRESETS.find(p => `${p.bestOf}-${p.pointsToWin}` === selectedPreset);
    const sideChangeThreshold = (preset?.pointsToWin ?? 11) === 11 ? 6 : (preset?.pointsToWin ?? 11) === 15 ? 8 : 11;
    const newRules = {
      ...state.rules,
      bestOf: preset?.bestOf ?? state.rules.bestOf,
      pointsToWin: preset?.pointsToWin ?? state.rules.pointsToWin,
      maxTimeoutsPerTeam: timeoutsPerTeam,
      sideChangePointThreshold: sideChangeThreshold,
    };
    // Rebuild stored with new rules
    const updatedStored: StoredMatch = {
      ...stored,
      state: { ...stored.state, rules: newRules },
    };
    onConfirm({
      title: "Start Match?",
      message: `${state.team1Name} vs ${state.team2Name}\n${FORMAT_PRESETS.find(p => `${p.bestOf}-${p.pointsToWin}` === selectedPreset)?.label ?? ""}`,
      confirmLabel: "Start Match",
      onConfirm: () => { onUpdate(applyStartMatch(updatedStored, umpireName)); },
    });
  }

  return (
    <div className="px-3 mb-3">
      {/* Format selector */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-white/40 text-[10px] font-semibold uppercase tracking-wide mb-3">Match Format</div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {FORMAT_PRESETS.map(p => {
            const key = `${p.bestOf}-${p.pointsToWin}`;
            const active = selectedPreset === key;
            return (
              <button key={key} onClick={() => setSelectedPreset(key)}
                className="py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 text-left"
                style={active
                  ? { background: "#D4E04A", color: "#0A1A0A" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Timeouts per team */}
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-xs">Timeouts per team</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setTimeoutsPerTeam(Math.max(0, timeoutsPerTeam - 1))}
              className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}>−</button>
            <span className="text-white font-bold w-4 text-center">{timeoutsPerTeam}</span>
            <button onClick={() => setTimeoutsPerTeam(Math.min(3, timeoutsPerTeam + 1))}
              className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}>+</button>
          </div>
        </div>
      </div>

      <button
        onClick={applyPresetAndStart}
        className="w-full py-5 rounded-2xl font-black text-xl active:scale-95 transition-transform"
        style={{ background: "#D4E04A", color: "#0A1A0A" }}>
        Start Match
      </button>
    </div>
  );
}

// ── All Matches List ──────────────────────────────────────────────────────────

function AllMatchesList({ onSelect }: { onSelect: (matchId: string) => void }) {
  const [allMatches, setAllMatches] = useState<StoredMatch[]>([]);
  const [umpireName, setUmpireName] = useState("");
  const [viewMode, setViewMode] = useState<"my" | "all">("my");

  useEffect(() => {
    const saved = localStorage.getItem("courtroom_umpire_name");
    if (saved) setUmpireName(saved);
    loadMatches();
  }, []);

  function loadMatches() {
    const ids = getAllMatchIds();
    const matches: StoredMatch[] = [];
    for (const id of ids) {
      const m = getMatch(id);
      if (m) matches.push(m);
    }
    matches.sort((a, b) => {
      const order = (s: string) =>
        s === "GAME_IN_PROGRESS" ? 0 : s === "READY" || s === "SCHEDULED" ? 1 : 2;
      const courtA = a.state.court ?? "zzz";
      const courtB = b.state.court ?? "zzz";
      if (order(a.state.status) !== order(b.state.status)) return order(a.state.status) - order(b.state.status);
      return courtA.localeCompare(courtB);
    });
    setAllMatches(matches);
  }

  function saveUmpireName(name: string) {
    setUmpireName(name);
    localStorage.setItem("courtroom_umpire_name", name);
  }

  const statusLabel = (s: string) =>
    s === "GAME_IN_PROGRESS" ? "● Live" :
    s === "MATCH_COMPLETED" ? "Done" :
    s === "FORFEITED" ? "Forfeit" :
    s === "MATCH_DISPUTED" ? "Disputed" : "Ready";

  const statusColor = (s: string) =>
    s === "GAME_IN_PROGRESS" ? "#D4E04A" :
    s === "MATCH_COMPLETED" ? "#6EE7B7" :
    "rgba(255,255,255,0.3)";

  const myMatches = allMatches.filter(
    (m) => !umpireName || !m.state.umpireName || m.state.umpireName.toLowerCase() === umpireName.toLowerCase()
  );
  const visibleMatches = viewMode === "my" ? myMatches : allMatches;

  const byCourt = new Map<string, StoredMatch[]>();
  for (const m of visibleMatches) {
    const key = m.state.court ?? "No Court Assigned";
    const arr = byCourt.get(key) ?? [];
    arr.push(m);
    byCourt.set(key, arr);
  }
  const sortedCourts = Array.from(byCourt.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto px-4 py-8" style={{ background: "#0A1A0A" }}>
      <div className="mb-6">
        <div className="text-[#D4E04A]/40 text-[10px] font-bold uppercase tracking-widest mb-1">Umpire Console</div>
        <h1 className="text-white text-2xl font-bold">My Matches</h1>
      </div>

      <div className="mb-4">
        <input
          value={umpireName}
          onChange={(e) => saveUmpireName(e.target.value)}
          placeholder="Your name (umpire)..."
          className="w-full px-4 py-3 rounded-2xl text-white text-sm focus:outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        <button onClick={() => setViewMode("my")}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={viewMode === "my" ? { background: "#D4E04A", color: "#0A1A0A" } : { color: "rgba(255,255,255,0.35)" }}>
          Mine {myMatches.length > 0 && `(${myMatches.length})`}
        </button>
        <button onClick={() => setViewMode("all")}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={viewMode === "all" ? { background: "#D4E04A", color: "#0A1A0A" } : { color: "rgba(255,255,255,0.35)" }}>
          All {allMatches.length > 0 && `(${allMatches.length})`}
        </button>
      </div>

      {visibleMatches.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-white/25 text-sm">
            {viewMode === "my" && umpireName ? `No matches assigned to "${umpireName}".` : "No matches yet."}
          </div>
          {viewMode === "my" && (
            <button onClick={() => setViewMode("all")} className="text-[#D4E04A]/40 text-xs mt-2 underline">
              View all matches
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCourts.map(([courtName, matches]) => (
            <div key={courtName}>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[#D4E04A]/50 text-[10px] font-bold uppercase tracking-widest">{courtName}</div>
                <div className="flex-1 h-px" style={{ background: "rgba(212,224,74,0.1)" }} />
              </div>
              <div className="space-y-2">
                {matches.map((m) => {
                  const isLive = m.state.status === "GAME_IN_PROGRESS";
                  const isDone = m.state.status === "MATCH_COMPLETED" || m.state.status === "FORFEITED";
                  const isMyMatch = umpireName && m.state.umpireName?.toLowerCase() === umpireName.toLowerCase();
                  const t1Parts = m.state.team1Name.split(" / ");
                  const t2Parts = m.state.team2Name.split(" / ");
                  return (
                    <button key={m.state.matchId} onClick={() => onSelect(m.state.matchId)}
                      className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
                      style={{
                        background: isLive ? "rgba(212,224,74,0.08)" : "rgba(255,255,255,0.04)",
                        border: isLive ? "1px solid rgba(212,224,74,0.25)" : isMyMatch ? "1px solid rgba(212,224,74,0.1)" : "1px solid rgba(255,255,255,0.06)",
                        opacity: isDone ? 0.6 : 1,
                      }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-semibold">
                            {t1Parts[0]}{t1Parts[1] && <span className="text-white/40 text-xs font-normal"> & {t1Parts[1]}</span>}
                          </div>
                          <div className="text-white/25 text-[10px] my-0.5">vs</div>
                          <div className="text-white text-sm font-semibold">
                            {t2Parts[0]}{t2Parts[1] && <span className="text-white/40 text-xs font-normal"> & {t2Parts[1]}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {m.state.groupName && <span className="text-white/25 text-[10px]">{m.state.groupName}</span>}
                            {m.state.round && <span className="text-white/20 text-[10px]">· {m.state.round}</span>}
                            {m.state.umpireName && <span className="text-white/20 text-[10px]">· {m.state.umpireName}</span>}
                          </div>
                          {isLive && (
                            <div className="text-[#D4E04A] text-xs font-bold mt-1">
                              {m.state.games[m.state.currentGame]?.team1 ?? 0} — {m.state.games[m.state.currentGame]?.team2 ?? 0}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs font-bold" style={{ color: statusColor(m.state.status) }}>
                            {statusLabel(m.state.status)}
                          </div>
                          {!isDone && (
                            <div className="text-[#D4E04A]/60 text-xs mt-1 font-semibold">
                              {isLive ? "Continue →" : "Start →"}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/umpire/new"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold"
          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
          + Create New Match
        </Link>
      </div>
    </div>
  );
}

// ── Match Selector (create new) ───────────────────────────────────────────────

function MatchSelector({ onSelect }: { onSelect: (matchId: string) => void }) {
  const [tournaments, setTournaments] = useState<ReturnType<typeof getTournaments>>([]);
  const [umpireName, setUmpireName] = useState("");
  const [creating, setCreating] = useState<{ tournamentId: string; categoryId: string } | null>(null);
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [court, setCourt] = useState("");
  const [round, setRound] = useState("Pool");

  useEffect(() => {
    setTournaments(getTournaments());
    const saved = localStorage.getItem("courtroom_umpire_name");
    if (saved) setUmpireName(saved);
  }, []);

  function saveUmpireName(name: string) {
    setUmpireName(name);
    localStorage.setItem("courtroom_umpire_name", name);
  }

  function createMatch() {
    if (!creating || !team1.trim() || !team2.trim() || !umpireName.trim()) return;
    const t = tournaments.find((t) => t.id === creating.tournamentId);
    const cat = t?.categories.find((c) => c.id === creating.categoryId);
    if (!t || !cat) return;
    const rules = parseRulesFromFormat(cat.scoringFormat, cat.type);
    const stored = createNewMatch({
      tournamentId: creating.tournamentId,
      categoryId: creating.categoryId,
      team1Name: team1.trim(),
      team2Name: team2.trim(),
      rules,
      court: court.trim() || undefined,
      round: round.trim() || undefined,
      umpireName: umpireName.trim(),
    });
    saveMatch(stored);
    onSelect(stored.state.matchId);
  }

  const publishedCategories = tournaments.flatMap((t) =>
    t.categories.filter((c) => c.drawPublished).map((c) => ({ tournament: t, category: c }))
  );

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto px-4 py-8" style={{ background: "#0A1A0A" }}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/umpire" className="text-white/30 hover:text-white/60">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <div className="text-[#D4E04A]/40 text-[10px] font-bold uppercase tracking-widest mb-0.5">Umpire Console</div>
          <h1 className="text-white text-xl font-bold">Create Match</h1>
        </div>
      </div>

      <div className="mb-5">
        <input value={umpireName} onChange={(e) => saveUmpireName(e.target.value)} placeholder="Your name (umpire)..."
          className="w-full px-4 py-3 rounded-2xl text-white text-sm focus:outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
      </div>

      {publishedCategories.length > 0 && (
        <div className="mb-5">
          <div className="text-white/30 text-xs font-semibold uppercase tracking-wide mb-2">Category</div>
          <div className="space-y-2">
            {publishedCategories.map(({ tournament, category }) => (
              <button key={category.id} onClick={() => setCreating({ tournamentId: tournament.id, categoryId: category.id })}
                className="w-full text-left px-4 py-3 rounded-2xl transition-all active:scale-95"
                style={creating?.categoryId === category.id
                  ? { background: "#2D5A27", border: "1px solid #D4E04A" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-white text-sm font-semibold">{category.name}</div>
                <div className="text-white/35 text-xs mt-0.5">{tournament.name} · {category.scoringFormat}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {creating && (
        <div className="mb-5 rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-white text-sm font-semibold">Match Details</div>
          <input value={team1} onChange={(e) => setTeam1(e.target.value)} placeholder="Team 1 / Player 1"
            className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <input value={team2} onChange={(e) => setTeam2(e.target.value)} placeholder="Team 2 / Player 2"
            className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <div className="flex gap-2">
            <input value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Court"
              className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <input value={round} onChange={(e) => setRound(e.target.value)} placeholder="Round"
              className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <button onClick={createMatch} disabled={!team1.trim() || !team2.trim() || !umpireName.trim()}
            className="w-full py-3 rounded-2xl font-bold text-sm disabled:opacity-40"
            style={{ background: "#D4E04A", color: "#0A1A0A" }}>
            Create & Start Scoring
          </button>
        </div>
      )}

      {publishedCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-white/25 text-sm">No published draws yet.</div>
          <Link href="/admin/tournaments" className="inline-block mt-4 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
            Go to Admin
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main Scoring Page ─────────────────────────────────────────────────────────

export default function UmpireScoringPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params;
  const isNew = matchId === "new";
  const isAll = matchId === "all";

  const [stored, setStored] = useState<StoredMatch | null>(null);
  const [umpireName, setUmpireName] = useState("Umpire");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastPointFlash, setLastPointFlash] = useState<"team1" | "team2" | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string; message: string; confirmLabel: string; danger?: boolean;
    requireReason?: boolean; onConfirm: (reason?: string) => void;
  } | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showServingSelector, setShowServingSelector] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isNew || isAll) return;
    const saved = localStorage.getItem("courtroom_umpire_name");
    if (saved) setUmpireName(saved);
    const m = getMatch(matchId);
    if (m) {
      setStored(m);
      setElapsedSeconds(m.state.elapsedSeconds);
    }
  }, [matchId, isNew, isAll]);

  useEffect(() => {
    if (!stored) return;
    const { status } = stored.state;
    if (status === "GAME_IN_PROGRESS") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => {
          const next = s + 1;
          if (next % 10 === 0 && stored) {
            saveMatch({ ...stored, state: { ...stored.state, elapsedSeconds: next } });
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stored?.state.status]);

  useEffect(() => {
    if (!lastPointFlash) return;
    const t = setTimeout(() => setLastPointFlash(null), 1200);
    return () => clearTimeout(t);
  }, [lastPointFlash]);

  function update(newStored: StoredMatch) {
    const withTime: StoredMatch = { ...newStored, state: { ...newStored.state, elapsedSeconds } };
    saveMatch(withTime);
    setStored(withTime);
    const s = withTime.state.status;
    if ((s === "MATCH_COMPLETED" || s === "FORFEITED") && withTime.state.tournamentId && withTime.state.categoryId) {
      recomputeStandings(withTime.state.tournamentId, withTime.state.categoryId);
    }
  }

  const scorePoint = useCallback(() => {
    if (!stored) return;
    if (stored.state.status !== "GAME_IN_PROGRESS") return;
    if (!stored.state.servingTeam) return;
    const updated = applyPoint(stored, umpireName);
    update(updated);
    setLastPointFlash(stored.state.servingTeam as "team1" | "team2");
  }, [stored, umpireName, elapsedSeconds]);

  const sideOut = useCallback(() => {
    if (!stored) return;
    if (stored.state.status !== "GAME_IN_PROGRESS") return;
    if (!stored.state.servingTeam) return;
    const updated = applySideOut(stored, umpireName);
    update(updated);
  }, [stored, umpireName, elapsedSeconds]);

  if (isAll) return <AllMatchesList onSelect={(id) => { window.location.href = `/umpire/${id}`; }} />;
  if (isNew) return <MatchSelector onSelect={(id) => { window.location.href = `/umpire/${id}`; }} />;

  if (!stored) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "#0A1A0A" }}>
        <div className="text-white/40 text-sm">Match not found.</div>
        <Link href="/umpire/all" className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "#D4E04A", color: "#0A1A0A" }}>
          View All Matches
        </Link>
      </div>
    );
  }

  const { state, events } = stored;
  const currentScore = state.games[state.currentGame] ?? { team1: 0, team2: 0 };
  const isReady = state.status === "READY" || state.status === "SCHEDULED";
  const isLive = state.status === "GAME_IN_PROGRESS";
  const isGameBreak = state.status === "GAME_BREAK";
  const isPaused = state.status === "MATCH_PAUSED";
  const isOver = state.status === "MATCH_COMPLETED" || state.status === "FORFEITED" || state.status === "MATCH_DISPUTED";
  const gamesNeeded = Math.ceil(state.rules.bestOf / 2);
  const servingCallout = getServingCallout(state);
  const canUndoPoint = canUndo(stored);

  const t1Parts = state.team1Name.split(" / ");
  const t2Parts = state.team2Name.split(" / ");
  const serving1 = state.servingTeam === "team1";
  const serving2 = state.servingTeam === "team2";

  // Flash colors
  const flashTeam = lastPointFlash;
  const flashBg = flashTeam === "team1" ? "rgba(61,107,53,0.4)" : flashTeam === "team2" ? "rgba(26,39,68,0.5)" : "transparent";

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto" style={{ background: "#0A1A0A" }}>
      {confirm && (
        <ConfirmModal
          title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel}
          danger={confirm.danger} requireReason={confirm.requireReason}
          onConfirm={(reason) => { confirm.onConfirm(reason); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link href="/umpire/all" className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
        </Link>
        <div className="text-center">
          <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            {state.court ? state.court : "Umpire"}
          </div>
          {state.groupName && <div className="text-white/25 text-[10px]">{state.groupName}</div>}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Clock size={11} style={{ color: "rgba(255,255,255,0.4)" }} />
          <span className="tabular-nums font-mono text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      {/* ── STATUS + GAME PILLS ── */}
      <div className="flex items-center justify-center gap-2 px-4 mb-3">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={isLive
            ? { background: "rgba(212,224,74,0.12)", color: "#D4E04A", border: "1px solid rgba(212,224,74,0.25)" }
            : isPaused
            ? { background: "rgba(251,146,60,0.12)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.25)" }
            : isOver
            ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }
            : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {isLive ? "● LIVE" : isPaused ? "⏸ PAUSED" : isGameBreak ? "GAME BREAK" : isOver ? "COMPLETED" : "READY"}
        </span>
        {state.games.map((g, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`h-1 rounded-full transition-all ${i === state.currentGame ? "w-6 bg-[#D4E04A]" : g.winner ? "w-3 bg-white/30" : "w-3 bg-white/10"}`} />
            {g.winner && (
              <span className="text-[8px] font-bold" style={{ color: g.winner === "team1" ? "#6EE7B7" : "#93C5FD" }}>
                {g.team1}-{g.team2}
              </span>
            )}
          </div>
        ))}
        <span className="text-white/20 text-[10px]">G{state.currentGame + 1}/{state.rules.bestOf}</span>
      </div>

      {/* ── SCOREBOARD ── */}
      <div className="mx-3 rounded-3xl overflow-hidden mb-3" style={{
        background: flashTeam ? flashBg : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        transition: "background 0.3s ease",
      }}>
        <div className="flex items-stretch">
          {/* Team 1 */}
          <div className="flex-1 flex flex-col items-center py-5 px-3" style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: serving1 ? "rgba(61,107,53,0.15)" : "transparent",
          }}>
            {serving1 && (
              <div className="text-[#D4E04A] text-[10px] font-bold mb-1 flex items-center gap-1">
                <span>▶</span> SERVING
              </div>
            )}
            <div className="text-white font-bold text-sm text-center leading-tight">{t1Parts[0]}</div>
            {t1Parts[1] && <div className="text-white/35 text-[10px] text-center mt-0.5">& {t1Parts[1]}</div>}
            <div className="text-[7rem] font-black text-white leading-none tabular-nums mt-2"
              style={{ fontFamily: "Georgia, serif", color: serving1 ? "#D4E04A" : "white" }}>
              {currentScore.team1}
            </div>
            <div className="flex gap-1.5 mt-3">
              {Array.from({ length: gamesNeeded }).map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < state.team1GamesWon ? "bg-[#D4E04A]" : "bg-white/10"}`} />
              ))}
            </div>
          </div>

          {/* Center divider */}
          <div className="flex flex-col items-center justify-center px-2 py-4 gap-2">
            <div className="text-white/15 text-2xl font-light">:</div>
            {servingCallout && (
              <div className="text-[#D4E04A]/40 text-[9px] font-mono text-center whitespace-nowrap rotate-90 origin-center" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 8 }}>
                {servingCallout}
              </div>
            )}
          </div>

          {/* Team 2 */}
          <div className="flex-1 flex flex-col items-center py-5 px-3" style={{
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            background: serving2 ? "rgba(26,39,68,0.3)" : "transparent",
          }}>
            {serving2 && (
              <div className="text-[#D4E04A] text-[10px] font-bold mb-1 flex items-center gap-1">
                SERVING <span>◀</span>
              </div>
            )}
            <div className="text-white font-bold text-sm text-center leading-tight">{t2Parts[0]}</div>
            {t2Parts[1] && <div className="text-white/35 text-[10px] text-center mt-0.5">& {t2Parts[1]}</div>}
            <div className="text-[7rem] font-black text-white leading-none tabular-nums mt-2"
              style={{ fontFamily: "Georgia, serif", color: serving2 ? "#D4E04A" : "white" }}>
              {currentScore.team2}
            </div>
            <div className="flex gap-1.5 mt-3">
              {Array.from({ length: gamesNeeded }).map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < state.team2GamesWon ? "bg-[#D4E04A]" : "bg-white/10"}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Callout strip */}
        {isLive && servingCallout && (
          <div className="px-4 py-2 text-center text-[11px] font-bold tracking-widest" style={{ background: "rgba(212,224,74,0.06)", color: "#D4E04A", borderTop: "1px solid rgba(212,224,74,0.1)" }}>
            {servingCallout}
            <span className="text-[#D4E04A]/35 font-normal ml-2 text-[10px]">
              {serving1 ? t1Parts[0] : t2Parts[0]} serving
            </span>
          </div>
        )}

        {state.games.length > 1 && (
          <div className="text-center py-1.5 text-white/20 text-[10px]" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            {formatMatchScore(state)}
          </div>
        )}
      </div>

      {/* ── LIVE SCORING ── */}
      {isLive && (
        <div className="px-3 mb-3 space-y-2">
          {!state.servingTeam && (
            <div className="space-y-2">
              <div className="text-center text-[11px] font-semibold py-2.5 rounded-2xl"
                style={{ background: "rgba(212,224,74,0.07)", color: "rgba(212,224,74,0.6)", border: "1px solid rgba(212,224,74,0.12)" }}>
                Who serves first?
              </div>
              <div className="flex gap-2">
                <button onPointerDown={() => { update(applySetServingTeam(stored, "team1", 0, umpireName, true)); }}
                  className="flex-1 py-5 rounded-2xl text-white font-bold active:scale-95 transition-transform text-sm"
                  style={{ background: "#2D5A27" }}>
                  {t1Parts[0]}
                </button>
                <button onPointerDown={() => { update(applySetServingTeam(stored, "team2", 0, umpireName, true)); }}
                  className="flex-1 py-5 rounded-2xl text-white font-bold active:scale-95 transition-transform text-sm"
                  style={{ background: "#1A2744" }}>
                  {t2Parts[0]}
                </button>
              </div>
            </div>
          )}

          {state.servingTeam && (
            <>
              {/* BIG POINT BUTTON */}
              <button onPointerDown={() => scorePoint()}
                className="w-full rounded-3xl text-white font-black active:scale-[0.97] transition-transform select-none flex flex-col items-center justify-center gap-1"
                style={{
                  background: serving1 ? "linear-gradient(135deg, #2D5A27, #3D7A35)" : "linear-gradient(135deg, #1A2744, #243560)",
                  minHeight: "140px",
                  boxShadow: serving1 ? "0 8px 32px rgba(61,107,53,0.4)" : "0 8px 32px rgba(26,39,68,0.5)",
                }}>
                <div className="text-6xl font-black">+1</div>
                <div className="text-sm font-semibold text-white/60">
                  {serving1 ? t1Parts[0] : t2Parts[0]} scores
                </div>
              </button>

              {/* SIDE OUT */}
              <button onPointerDown={() => sideOut()}
                className="w-full py-4 rounded-2xl font-bold active:scale-95 transition-transform select-none flex items-center justify-center gap-3"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-sm">SIDE OUT</span>
                <span className="text-[10px] text-white/30">
                  {state.isFirstServerOfGame ? "→ other team serves" : state.servingPlayerIndex === 0 ? "→ partner serves" : "→ other team serves"}
                </span>
              </button>

              {/* Change server */}
              <button onClick={() => setShowServingSelector(!showServingSelector)}
                className="w-full py-1.5 text-[10px] font-semibold text-center"
                style={{ color: "rgba(212,224,74,0.25)", background: "transparent" }}>
                {showServingSelector ? "▲ hide" : "▼ change server"}
              </button>
              {showServingSelector && (
                <ServingSelector state={state} umpireName={umpireName} onUpdate={(s) => { setStored(s); setShowServingSelector(false); }} />
              )}
            </>
          )}
        </div>
      )}

      {/* ── READY: START MATCH ── */}
      {isReady && (
        <ReadyPanel stored={stored} state={state} umpireName={umpireName} onUpdate={update} onConfirm={setConfirm} />
      )}

      {/* ── GAME BREAK ── */}
      {isGameBreak && (
        <div className="mx-3 mb-3 rounded-2xl p-5 text-center" style={{ background: "rgba(212,224,74,0.06)", border: "1px solid rgba(212,224,74,0.15)" }}>
          <div className="text-[#D4E04A] text-lg font-bold mb-1">Game {state.currentGame} Complete</div>
          <div className="text-white/40 text-sm mb-4">
            {state.games[state.currentGame - 1]?.team1 ?? 0} — {state.games[state.currentGame - 1]?.team2 ?? 0}
          </div>
          <button onClick={() => { update(applyStartNextGame(stored, umpireName)); }}
            className="w-full py-4 rounded-xl font-bold active:scale-95 transition-transform"
            style={{ background: "#D4E04A", color: "#0A1A0A" }}>
            Start Game {state.currentGame + 1}
          </button>
        </div>
      )}

      {/* ── PAUSED ── */}
      {isPaused && (
        <div className="mx-3 mb-3 rounded-2xl p-5 text-center" style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.15)" }}>
          <div className="text-orange-400 text-lg font-bold mb-3">Match Paused</div>
          <button onClick={() => { update(applyResumeMatch(stored, umpireName)); }}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: "#FB923C", color: "white" }}>
            <Play size={18} /> Resume
          </button>
        </div>
      )}

      {/* ── MATCH OVER ── */}
      {isOver && (
        <div className="mx-3 mb-3 rounded-2xl p-6 text-center" style={{ background: "rgba(212,224,74,0.06)", border: "1.5px solid rgba(212,224,74,0.2)" }}>
          <div className="text-4xl mb-3">
            {state.status === "FORFEITED" ? "🏳️" : state.status === "MATCH_DISPUTED" ? "⚠️" : "🏆"}
          </div>
          <div className="text-[#D4E04A] text-xl font-bold mb-1">
            {state.status === "FORFEITED" ? "Forfeit" : state.status === "MATCH_DISPUTED" ? "Disputed" : "Match Complete!"}
          </div>
          {state.winnerId && (
            <div className="text-white text-base font-semibold mb-1">
              {state.winnerId === "team1" ? state.team1Name : state.team2Name} wins
            </div>
          )}
          <div className="text-white/35 text-sm mb-2">{formatMatchScore(state)}</div>
          {state.resultNotes && <div className="text-white/30 text-xs mb-3">{state.resultNotes}</div>}
          <div className="text-white/25 text-xs mb-4">Duration: {formatTime(elapsedSeconds)}</div>
          <Link href="/umpire/all" className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "#D4E04A", color: "#0A1A0A" }}>
            ← Back to Matches
          </Link>
        </div>
      )}

      {/* ── CONTROLS ROW (Undo / Pause / T/O) ── */}
      {(isLive || isPaused) && (
        <div className="px-3 mb-2">
          <div className="grid grid-cols-4 gap-2">
            {/* Undo */}
            <button
              onClick={() => {
                if (!canUndoPoint) return;
                setConfirm({
                  title: "Undo Last Point?",
                  message: "Reverses the last scored point.",
                  confirmLabel: "Undo",
                  onConfirm: () => { update(applyUndoLastPoint(stored, umpireName)); },
                });
              }}
              disabled={!canUndoPoint}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-25"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
              <RotateCcw size={17} />
              <span className="text-[9px] font-semibold">Undo</span>
            </button>

            {/* Pause / Resume */}
            <button
              onClick={() => {
                if (isLive) update(applyPauseMatch(stored, umpireName));
                else update(applyResumeMatch(stored, umpireName));
              }}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
              {isLive ? <Pause size={17} /> : <Play size={17} />}
              <span className="text-[9px] font-semibold">{isLive ? "Pause" : "Resume"}</span>
            </button>

            {/* T/O Team 1 */}
            <button
              onClick={() => {
                const rem = state.rules.maxTimeoutsPerTeam - state.timeouts.team1Used;
                if (rem <= 0) return;
                setConfirm({
                  title: `Timeout — ${t1Parts[0]}`,
                  message: `${rem} timeout${rem > 1 ? "s" : ""} left.`,
                  confirmLabel: "Call Timeout",
                  onConfirm: () => { update(applyTimeout(stored, "team1", umpireName)); },
                });
              }}
              disabled={state.timeouts.team1Used >= state.rules.maxTimeoutsPerTeam}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-25"
              style={{ background: "rgba(61,107,53,0.2)", color: "#A8D5A0" }}>
              <AlertCircle size={17} />
              <span className="text-[9px] font-semibold">T/O {t1Parts[0].slice(0, 4)}</span>
              <span className="text-[8px] opacity-60">{state.rules.maxTimeoutsPerTeam - state.timeouts.team1Used} left</span>
            </button>

            {/* T/O Team 2 */}
            <button
              onClick={() => {
                const rem = state.rules.maxTimeoutsPerTeam - state.timeouts.team2Used;
                if (rem <= 0) return;
                setConfirm({
                  title: `Timeout — ${t2Parts[0]}`,
                  message: `${rem} timeout${rem > 1 ? "s" : ""} left.`,
                  confirmLabel: "Call Timeout",
                  onConfirm: () => { update(applyTimeout(stored, "team2", umpireName)); },
                });
              }}
              disabled={state.timeouts.team2Used >= state.rules.maxTimeoutsPerTeam}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-25"
              style={{ background: "rgba(26,39,68,0.4)", color: "#93C5FD" }}>
              <AlertCircle size={17} />
              <span className="text-[9px] font-semibold">T/O {t2Parts[0].slice(0, 4)}</span>
              <span className="text-[8px] opacity-60">{state.rules.maxTimeoutsPerTeam - state.timeouts.team2Used} left</span>
            </button>
          </div>
        </div>
      )}

      {/* ── DANGER ACTIONS ── */}
      {(isLive || isPaused || isGameBreak) && (
        <div className="px-3 mb-2 flex gap-2">
          <button
            onClick={() => setConfirm({
              title: "Forfeit Match",
              message: `${t1Parts[0]} forfeits?`,
              confirmLabel: `${t1Parts[0]} Forfeits`,
              danger: true,
              onConfirm: () => { update(applyForfeit(stored, "team1", umpireName)); },
            })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-all"
            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}>
            <Flag size={12} /> Forfeit
          </button>
          <button
            onClick={() => setConfirm({
              title: "Dispute Match",
              message: "Describe the issue.",
              confirmLabel: "Mark Disputed",
              danger: true,
              requireReason: true,
              onConfirm: (reason) => { update(applyDispute(stored, umpireName, reason ?? "Disputed")); },
            })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-all"
            style={{ background: "rgba(251,146,60,0.08)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.15)" }}>
            <AlertTriangle size={12} /> Dispute
          </button>
        </div>
      )}

      {/* ── AUDIT LOG ── */}
      <div className="px-3 mb-2">
        <button onClick={() => setShowAudit(!showAudit)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-semibold transition-all"
          style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <Activity size={11} /> {showAudit ? "Hide" : "Show"} Audit Log ({events.length})
        </button>
      </div>

      {showAudit && <AuditLog events={events} state={state} />}

      <div className="h-10" />
    </div>
  );
}
