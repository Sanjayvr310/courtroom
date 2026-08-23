"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft, Clock, Users, Zap, Calendar, Play, CheckCircle,
  AlertCircle, RefreshCw, ExternalLink,
} from "lucide-react";
import { getTournament } from "@/lib/store";
import type { Tournament, TournamentCategory } from "@/lib/store";
import {
  createNewMatch, saveMatch, getMatchesForCategory,
  parseRulesFromFormat, StoredMatch,
} from "@/lib/match-store";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduledMatch {
  matchId: string;
  groupName: string;
  round: string;
  team1Name: string;
  team2Name: string;
  court: string;
  courtNumber: number;
  scheduledTime: string; // ISO
  umpireName: string;
  slotIndex: number; // slot within that court (0-based)
}

// ── Court colour palette ──────────────────────────────────────────────────────
const COURT_COLORS = [
  { bg: "#1A3318", text: "#D4E04A" },
  { bg: "#1A2744", text: "#93C5FD" },
  { bg: "#3D1A18", text: "#FCA5A5" },
  { bg: "#2D1A3D", text: "#C4B5FD" },
  { bg: "#1A2D2D", text: "#6EE7B7" },
  { bg: "#2D2D1A", text: "#FDE68A" },
  { bg: "#2D1A1A", text: "#FDBA74" },
  { bg: "#1A2D1A", text: "#86EFAC" },
];

// ── Scheduler: one group per court, sequential within court ───────────────────

interface RawMatch {
  groupName: string;
  team1Name: string;
  team2Name: string;
}

function buildGroupMatches(
  groups: { name: string; teams: { player1: string; player2?: string }[] }[]
): { groupName: string; matches: RawMatch[] }[] {
  return groups.map((group) => {
    const matches: RawMatch[] = [];
    const teams = group.teams;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const t1 = teams[i] as any;
        const t2 = teams[j] as any;
        const t1Name = t1.player2 ? `${t1.player1} / ${t1.player2}` : t1.player1;
        const t2Name = t2.player2 ? `${t2.player1} / ${t2.player2}` : t2.player1;
        matches.push({ groupName: group.name, team1Name: t1Name, team2Name: t2Name });
      }
    }
    return { groupName: group.name, matches };
  });
}

function scheduleGroupsToFixedCourts(
  groupedMatches: { groupName: string; matches: RawMatch[] }[],
  numCourts: number,
  courtNames: string[],
  umpireNames: string[],
  matchDurationMinutes: number,
  bufferMinutes: number,
  startDate: string,
  startTime: string
): ScheduledMatch[] {
  const slotMinutes = matchDurationMinutes + bufferMinutes;
  const baseDate = new Date(`${startDate}T${startTime}:00`);
  const result: ScheduledMatch[] = [];

  // Assign each group to a court (round-robin if more groups than courts)
  // All matches of a group stay on the same court, sequential
  groupedMatches.forEach((grp, grpIdx) => {
    const courtIdx = grpIdx % numCourts;
    const courtName = courtNames[courtIdx] ?? `Court ${courtIdx + 1}`;
    const umpire = umpireNames[courtIdx] ?? "";

    // Count how many matches are already assigned to this court before this group
    const matchesOnCourtBefore = result.filter((m) => m.courtNumber === courtIdx + 1).length;

    grp.matches.forEach((m, matchIdx) => {
      const slotIndex = matchesOnCourtBefore + matchIdx;
      const offsetMs = slotIndex * slotMinutes * 60 * 1000;
      const matchTime = new Date(baseDate.getTime() + offsetMs);

      result.push({
        matchId: "",
        groupName: grp.groupName,
        round: "Pool",
        team1Name: m.team1Name,
        team2Name: m.team2Name,
        court: courtName,
        courtNumber: courtIdx + 1,
        scheduledTime: matchTime.toISOString(),
        umpireName: umpire,
        slotIndex,
      });
    });
  });

  return result;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SchedulePage({
  params,
}: {
  params: { id: string; catId: string };
}) {
  const { id: tournamentId, catId } = params;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [category, setCategory] = useState<TournamentCategory | null>(null);
  const [groups, setGroups] = useState<{ name: string; teams: any[] }[]>([]);

  // Config
  const [numCourts, setNumCourts] = useState(4);
  const [courtNames, setCourtNames] = useState<string[]>([]);
  const [umpireNames, setUmpireNames] = useState<string[]>([]);
  const [matchDuration, setMatchDuration] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [startTime, setStartTime] = useState("09:00");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Schedule state
  const [preview, setPreview] = useState<ScheduledMatch[]>([]);
  const [generated, setGenerated] = useState(false);
  const [existingMatches, setExistingMatches] = useState<StoredMatch[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const t = getTournament(tournamentId);
    if (!t) return;
    setTournament(t);
    const cat = t.categories.find((c) => c.id === catId);
    if (!cat) return;
    setCategory(cat);
    if (t.startDate) setStartDate(t.startDate);

    if (cat.drawData) {
      try {
        const { groups: g } = JSON.parse(cat.drawData);
        setGroups(g ?? []);
        // Default courts = number of groups (one court per group)
        const defaultCourts = Math.min(g?.length ?? 4, 20);
        setNumCourts(defaultCourts);
      } catch {}
    }

    // Always load existing matches fresh from localStorage on mount
    const existing = getMatchesForCategory(tournamentId, catId);
    setExistingMatches(existing);
    if (existing.length > 0) {
      setSaved(true);
      // Rebuild preview from existing matches so the schedule board shows
      // even when navigating back to this page
      const rebuilt: ScheduledMatch[] = existing.map((m, i) => ({
        matchId: m.state.matchId,
        groupName: m.state.groupName ?? "",
        round: m.state.round ?? "Pool",
        team1Name: m.state.team1Name,
        team2Name: m.state.team2Name,
        court: m.state.court ?? `Court 1`,
        courtNumber: parseInt(m.state.court?.replace(/\D/g, "") || "1") || 1,
        scheduledTime: new Date().toISOString(),
        umpireName: m.state.umpireName ?? "",
        slotIndex: i,
      }));
      setPreview(rebuilt);
      setGenerated(true);
    }
  }, [tournamentId, catId]);

  // Sync court/umpire arrays when numCourts changes
  useEffect(() => {
    setCourtNames((prev) => {
      const next = [...prev];
      while (next.length < numCourts) next.push(`Court ${next.length + 1}`);
      return next.slice(0, numCourts);
    });
    setUmpireNames((prev) => {
      const next = [...prev];
      while (next.length < numCourts) next.push("");
      return next.slice(0, numCourts);
    });
  }, [numCourts]);

  function generatePreview() {
    if (groups.length === 0) return;
    const groupedMatches = buildGroupMatches(groups);
    const sched = scheduleGroupsToFixedCourts(
      groupedMatches, numCourts, courtNames, umpireNames,
      matchDuration, bufferMinutes, startDate, startTime
    );
    setPreview(sched);
    setGenerated(true);
    setSaved(false);
  }

  function saveSchedule() {
    if (!tournament || !category || preview.length === 0) return;
    setSaving(true);

    const rules = parseRulesFromFormat(category.scoringFormat, category.type);

    // Load existing matches to avoid duplicates (match by team1+team2+group)
    const alreadySaved = getMatchesForCategory(tournamentId, catId);
    const existingKeys = new Set(
      alreadySaved.map((m) => `${m.state.team1Name}|${m.state.team2Name}|${m.state.groupName}`)
    );

    const finalSchedule: ScheduledMatch[] = preview.map((m) => {
      const key = `${m.team1Name}|${m.team2Name}|${m.groupName}`;
      // If already saved, reuse the existing matchId
      const existing = alreadySaved.find(
        (e) => e.state.team1Name === m.team1Name && e.state.team2Name === m.team2Name && e.state.groupName === m.groupName
      );
      if (existing) {
        return { ...m, matchId: existing.state.matchId };
      }
      const stored = createNewMatch({
        tournamentId,
        categoryId: catId,
        team1Name: m.team1Name,
        team2Name: m.team2Name,
        rules,
        groupName: m.groupName,
        round: m.round,
        court: m.court,
        umpireName: m.umpireName || undefined,
      });
      saveMatch(stored);
      return { ...m, matchId: stored.state.matchId };
    });

    setPreview(finalSchedule);
    const refreshed = getMatchesForCategory(tournamentId, catId);
    setExistingMatches(refreshed);
    setSaving(false);
    setSaved(true);
  }

  // Group preview by court for display
  const courtMap = new Map<number, ScheduledMatch[]>();
  for (const m of preview) {
    const arr = courtMap.get(m.courtNumber) ?? [];
    arr.push(m);
    courtMap.set(m.courtNumber, arr);
  }
  const courtEntries = Array.from(courtMap.entries()).sort((a, b) => a[0] - b[0]);

  const totalMatches = preview.length;
  const maxSlotsOnAnyCourt = Math.max(0, ...Array.from(courtMap.values()).map((v) => v.length));
  const endTime = preview.length > 0
    ? new Date(new Date(`${startDate}T${startTime}:00`).getTime() + maxSlotsOnAnyCourt * (matchDuration + bufferMinutes) * 60000)
    : null;

  if (!tournament || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F4EE" }}>
        <p style={{ color: "#8A8070" }}>Loading...</p>
      </div>
    );
  }

  if (!category.drawPublished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "#F8F4EE" }}>
        <AlertCircle size={40} style={{ color: "#D97706" }} />
        <div className="text-center">
          <div className="font-bold text-lg" style={{ color: "#1A3318" }}>Draw not published yet</div>
          <div className="text-sm mt-1" style={{ color: "#8A8070" }}>Publish the draw first before scheduling matches.</div>
        </div>
        <Link href={`/admin/tournaments/${tournamentId}/draw/${catId}`}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "#C9A84C", color: "#1A3318" }}>
          Go to Draw
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A3318 0%, #2D5A27 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-4">
            <Link href={`/admin/tournaments/${tournamentId}/draw/${catId}`}
              className="text-white/50 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "rgba(201,168,76,0.6)" }}>
                {tournament.name} · {category.name}
              </div>
              <h1 className="font-display text-2xl font-bold text-white">Match Scheduler</h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Each group plays all its matches on one dedicated court
              </p>
            </div>
            {saved && existingMatches.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "#F0FDF4", color: "#16A34A" }}>
                <CheckCircle size={12} /> {existingMatches.length} matches scheduled
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Config Sheet ── */}
        <div className="bg-white rounded-3xl p-6" style={{ border: "1px solid rgba(232,224,208,0.8)", boxShadow: "0 2px 12px rgba(26,51,24,0.06)" }}>
          <h2 className="font-display text-lg font-bold mb-1" style={{ color: "#1A3318" }}>
            📋 Schedule Configuration
          </h2>
          <p className="text-xs mb-5" style={{ color: "#8A8070" }}>
            {groups.length} groups detected · each group will be assigned its own court · all group matches play sequentially on that court
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#8A8070" }}>
                <Calendar size={11} className="inline mr-1" /> Tournament Date
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "#F8F4EE" }} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#8A8070" }}>
                <Clock size={11} className="inline mr-1" /> First Match Start Time
              </label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "#F8F4EE" }} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#8A8070" }}>
                <Zap size={11} className="inline mr-1" /> Number of Courts Available
              </label>
              <input type="number" min={1} max={groups.length || 20} value={numCourts}
                onChange={(e) => setNumCourts(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "#F8F4EE" }} />
              <p className="text-xs mt-1" style={{ color: "#8A8070" }}>
                {groups.length} groups → {numCourts} courts
                {groups.length > numCourts ? ` (${Math.ceil(groups.length / numCourts)} groups share each court)` : " (1 group per court)"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#8A8070" }}>
                <Clock size={11} className="inline mr-1" /> Match Duration (minutes)
              </label>
              <input type="number" min={5} max={120} value={matchDuration}
                onChange={(e) => setMatchDuration(Math.max(5, parseInt(e.target.value) || 30))}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "#F8F4EE" }} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#8A8070" }}>
                <Clock size={11} className="inline mr-1" /> Buffer Between Matches (min)
              </label>
              <input type="number" min={0} max={30} value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "#F8F4EE" }} />
            </div>

            <div className="flex items-center justify-center rounded-xl p-3" style={{ background: "#F8F4EE", border: "1px solid rgba(232,224,208,0.8)" }}>
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8A8070" }}>Slot Duration</div>
                <div className="text-2xl font-bold" style={{ color: "#1A3318" }}>{matchDuration + bufferMinutes} min</div>
                <div className="text-xs mt-0.5" style={{ color: "#8A8070" }}>{matchDuration}m match + {bufferMinutes}m buffer</div>
              </div>
            </div>
          </div>

          {/* Court Names & Umpires */}
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#8A8070" }}>
              <Users size={11} className="inline mr-1" /> Court Names & Umpire Assignment
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: numCourts }).map((_, i) => {
                const col = COURT_COLORS[i % COURT_COLORS.length];
                // Which groups are on this court?
                const groupsOnCourt = groups.filter((_, gi) => gi % numCourts === i).map((g) => g.name);
                return (
                  <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: col.bg }}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: col.text }}>
                        Court {i + 1}
                      </div>
                      {groupsOnCourt.length > 0 && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                          {groupsOnCourt.join(", ")}
                        </div>
                      )}
                    </div>
                    <input
                      value={courtNames[i] ?? `Court ${i + 1}`}
                      onChange={(e) => {
                        const next = [...courtNames];
                        next[i] = e.target.value;
                        setCourtNames(next);
                      }}
                      placeholder={`Court ${i + 1} name`}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}
                    />
                    <input
                      value={umpireNames[i] ?? ""}
                      onChange={(e) => {
                        const next = [...umpireNames];
                        next[i] = e.target.value;
                        setUmpireNames(next);
                      }}
                      placeholder="Umpire name (optional)"
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={generatePreview}
              disabled={groups.length === 0}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: "#C9A84C", color: "#1A3318" }}>
              <RefreshCw size={16} />
              {generated ? "Re-generate Schedule" : "Generate Schedule"}
            </button>
            {groups.length === 0 && (
              <div className="flex items-center text-xs" style={{ color: "#D97706" }}>
                <AlertCircle size={13} className="mr-1" /> No draw data. Publish draw first.
              </div>
            )}
          </div>
        </div>

        {/* ── Schedule Preview — by Court ── */}
        {generated && preview.length > 0 && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Matches", value: totalMatches },
                { label: "Courts Used", value: courtEntries.length },
                { label: "Groups", value: groups.length },
                { label: "Est. End Time", value: endTime ? formatTime(endTime.toISOString()) : "—" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-4 text-center"
                  style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                  <div className="font-display text-2xl font-bold" style={{ color: "#1A3318" }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#8A8070" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Court-by-court schedule */}
            <div className="space-y-4">
              {courtEntries.map(([courtNum, courtMatches]) => {
                const col = COURT_COLORS[(courtNum - 1) % COURT_COLORS.length];
                const courtName = courtMatches[0]?.court ?? `Court ${courtNum}`;
                const umpire = courtMatches[0]?.umpireName;
                // Group names on this court
                const groupsOnCourt = [...new Set(courtMatches.map((m) => m.groupName))];

                return (
                  <div key={courtNum} className="bg-white rounded-3xl overflow-hidden"
                    style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                    {/* Court header */}
                    <div className="px-6 py-4 flex items-center justify-between"
                      style={{ background: col.bg }}>
                      <div>
                        <div className="text-lg font-bold" style={{ color: col.text }}>{courtName}</div>
                        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                          {groupsOnCourt.join(" · ")} · {courtMatches.length} matches
                          {umpire ? ` · Umpire: ${umpire}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                          {formatDate(courtMatches[0].scheduledTime)}
                        </div>
                        <div className="text-sm font-bold" style={{ color: col.text }}>
                          {formatTime(courtMatches[0].scheduledTime)} → {endTime ? formatTime(endTime.toISOString()) : ""}
                        </div>
                      </div>
                    </div>

                    {/* Match list */}
                    <div className="divide-y" style={{ borderColor: "rgba(232,224,208,0.4)" }}>
                      {courtMatches.sort((a, b) => a.slotIndex - b.slotIndex).map((m, mi) => {
                        const existingMatch = existingMatches.find(
                          (em) => em.state.team1Name === m.team1Name && em.state.team2Name === m.team2Name
                            && em.state.groupName === m.groupName
                        );
                        return (
                          <div key={mi} className="px-6 py-3 flex items-center gap-4">
                            {/* Time */}
                            <div className="flex-shrink-0 w-14 text-center">
                              <div className="text-xs font-bold" style={{ color: "#C9A84C" }}>
                                {formatTime(m.scheduledTime)}
                              </div>
                              <div className="text-[10px]" style={{ color: "#8A8070" }}>#{mi + 1}</div>
                            </div>

                            {/* Group badge */}
                            <div className="flex-shrink-0">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: col.bg + "22", color: col.bg, border: `1px solid ${col.bg}33` }}>
                                {m.groupName}
                              </span>
                            </div>

                            {/* Teams */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                <span className="font-semibold truncate" style={{ color: "#1A3318" }}>
                                  {m.team1Name.split(" / ")[0]}
                                </span>
                                <span className="text-xs flex-shrink-0 font-bold" style={{ color: "#C9A84C" }}>vs</span>
                                <span className="font-semibold truncate" style={{ color: "#1A3318" }}>
                                  {m.team2Name.split(" / ")[0]}
                                </span>
                              </div>
                            </div>

                            {/* Score button */}
                            {existingMatch ? (
                              <Link
                                href={`/umpire/${existingMatch.state.matchId}`}
                                target="_blank"
                                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                                style={{ background: "#F0FDF4", color: "#16A34A" }}>
                                <Play size={10} /> Score
                              </Link>
                            ) : (
                              <span className="flex-shrink-0 text-[10px]" style={{ color: "#B0A898" }}>Save to score</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="flex gap-3">
              <button
                onClick={saveSchedule}
                disabled={saving || saved}
                className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: saved ? "#F0FDF4" : "#1A3318", color: saved ? "#16A34A" : "white" }}>
                {saving ? (
                  <><RefreshCw size={18} className="animate-spin" /> Saving...</>
                ) : saved ? (
                  <><CheckCircle size={18} /> Schedule Saved — {existingMatches.length} matches created</>
                ) : (
                  <><Zap size={18} /> Save Schedule & Create All Matches</>
                )}
              </button>
              {saved && (
                <Link
                  href="/umpire/new"
                  target="_blank"
                  className="px-5 py-4 rounded-2xl font-bold text-sm flex items-center gap-2"
                  style={{ background: "#C9A84C", color: "#1A3318" }}>
                  <ExternalLink size={16} /> Open Umpire Console
                </Link>
              )}
            </div>

            {/* Saved matches board */}
            {saved && existingMatches.length > 0 && (
              <div className="bg-white rounded-3xl p-6" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <h3 className="font-display text-base font-bold mb-4" style={{ color: "#1A3318" }}>
                  🎾 All Scheduled Matches — Launch Scoring
                </h3>
                <div className="space-y-2">
                  {existingMatches.map((m) => {
                    const courtIdx = (parseInt(m.state.court?.replace(/\D/g, "") || "1") - 1);
                    const col = COURT_COLORS[courtIdx % COURT_COLORS.length];
                    const statusColor = m.state.status === "MATCH_COMPLETED" ? "#16A34A"
                      : m.state.status === "GAME_IN_PROGRESS" ? "#D97706"
                      : "#8A8070";
                    return (
                      <div key={m.state.matchId}
                        className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ border: "1px solid rgba(232,224,208,0.8)", background: "#F8F4EE" }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.bg }} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: "#1A3318" }}>
                              {m.state.team1Name.split(" / ")[0]} vs {m.state.team2Name.split(" / ")[0]}
                            </div>
                            <div className="text-xs" style={{ color: "#8A8070" }}>
                              {m.state.court} · {m.state.groupName}
                              {m.state.umpireName ? ` · ${m.state.umpireName}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-semibold" style={{ color: statusColor }}>
                            {m.state.status === "MATCH_COMPLETED" ? "Done"
                              : m.state.status === "GAME_IN_PROGRESS" ? "● Live"
                              : m.state.status === "FORFEITED" ? "Forfeit"
                              : "Ready"}
                          </span>
                          <Link
                            href={`/umpire/${m.state.matchId}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: "#1A3318", color: "white" }}>
                            <Play size={11} /> Score
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
