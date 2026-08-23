"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Calendar, ChevronLeft, Trophy, Lock, Globe, Users, Phone, Mail, Activity } from "lucide-react";
import { getTournament, Tournament, formatPrize, getTournamentStatusLabel, getTournamentStatusColor, StandingsEntry, recomputeStandings } from "@/lib/store";
import { getMatchesForCategory, StoredMatch } from "@/lib/match-store";

// ─── Bracket types ────────────────────────────────────────────────────────────
interface BracketSlot { label: string; isBye: boolean; seed: number; groupIdx?: number; }

interface BracketMatch { id: string; round: number; matchNum: number; slot1: BracketSlot; slot2: BracketSlot; }

interface SavedTeam {
  seed: number;
  player1: string;
  player2?: string;
  teamRating: number;
  registrationId?: string;
}

interface SavedGroup {
  name: string;
  teams: SavedTeam[];
}

function getRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-Final";
  if (fromEnd === 2) return "Quarter-Final";
  if (fromEnd === 3) return "Round of 16";
  if (fromEnd === 4) return "Round of 32";
  return "Round of 64";
}

// ─── Bracket Slot (with actual player names from standings) ───────────────────
function MatchSlot({
  slot,
  groupStandings,
}: {
  slot: BracketSlot;
  groupStandings?: Map<number, StandingsEntry[]> | null;
}) {
  if (slot.isBye) {
    return (
      <div style={{ height: "50%", display: "flex", alignItems: "center", padding: "0 10px", background: "#F9FAFB" }}>
        <span style={{ fontSize: 10, fontStyle: "italic", color: "#9CA3AF" }}>BYE</span>
      </div>
    );
  }
  const isGroupSlot = slot.label.includes("·");

  let playerName = "";
  let partnerName = "";
  if (isGroupSlot && groupStandings && slot.groupIdx !== undefined) {
    const rankMatch = slot.label.match(/^(\d+)/);
    const rankNum = rankMatch ? parseInt(rankMatch[1]) - 1 : 0;
    const standings = groupStandings.get(slot.groupIdx);
    if (standings) {
      const entry = standings[rankNum];
      if (entry) {
        playerName = entry.player1Name;
        partnerName = entry.player2Name ?? "";
      }
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 8px", gap: 5, background: "white" }}>
      {isGroupSlot && slot.seed > 0 && slot.seed <= 8 && (
        <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, background: "#C9A84C", color: "#1A3318" }}>
          {slot.seed}
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        {playerName ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1A3318", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
              {playerName}
            </div>
            {partnerName && (
              <div style={{ fontSize: 10, fontWeight: 600, color: "#2D5A27", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                & {partnerName}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: isGroupSlot ? "#8A8070" : "#1A3318" }}>
              {isGroupSlot ? "TBD" : slot.label}
            </div>
            {isGroupSlot && (
              <div style={{ fontSize: 9, color: "#C9A84C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {slot.label}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WimbledonBracket({
  matches,
  totalRounds,
  groupStandings,
}: {
  matches: BracketMatch[];
  totalRounds: number;
  groupStandings?: Map<number, StandingsEntry[]> | null;
}) {
  const rounds: Record<number, BracketMatch[]> = {};
  for (const m of matches) {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  }
  const CARD_H = 76, BYE_H = 34, CARD_W = 210, GAP_X = 44, BASE_GAP_Y = 6;

  function isByeM(m: BracketMatch) { return (m.slot1.isBye || m.slot2.isBye) && !(m.slot1.isBye && m.slot2.isBye); }
  function mH(m: BracketMatch) { return isByeM(m) ? BYE_H : CARD_H; }

  const roundMatches: BracketMatch[][] = [];
  for (let r = 0; r < totalRounds; r++) {
    roundMatches.push((rounds[r] ?? []).filter(m => !(m.slot1.isBye && m.slot2.isBye)));
  }
  const mc: Record<string, number> = {};
  let cy = 28;
  for (const m of roundMatches[0] ?? []) { mc[m.id] = cy + mH(m) / 2; cy += mH(m) + BASE_GAP_Y; }
  const totalH = cy + 20;
  for (let r = 1; r < totalRounds; r++) {
    const prev = roundMatches[r - 1];
    (roundMatches[r] ?? []).forEach((m, mi) => {
      const f1 = prev[mi * 2], f2 = prev[mi * 2 + 1];
      if (f1 && f2) mc[m.id] = ((mc[f1.id] ?? 0) + (mc[f2.id] ?? 0)) / 2;
    });
  }

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "80vh" }}>
      <div style={{ position: "relative", width: totalRounds * (CARD_W + GAP_X) + 20, height: totalH, minWidth: 600 }}>
        {roundMatches.map((rMatches, round) => {
          const isFinal = round === totalRounds - 1;
          const x = round * (CARD_W + GAP_X);
          return rMatches.map((match, idx) => {
            const bye = isByeM(match);
            const h = mH(match);
            const centerY = mc[match.id] ?? 0;
            const y = centerY - h / 2;
            const nextMatch = round < totalRounds - 1 ? roundMatches[round + 1]?.[Math.floor(idx / 2)] : null;
            const nextCY = nextMatch ? (mc[nextMatch.id] ?? 0) : 0;
            const realSlot = bye ? (match.slot1.isBye ? match.slot2 : match.slot1) : null;
            return (
              <div key={match.id}>
                {round < totalRounds - 1 && nextMatch && (
                  <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                    <line x1={x + CARD_W} y1={centerY} x2={x + CARD_W + GAP_X / 2} y2={centerY} stroke="#C9A84C" strokeWidth="1.5" strokeOpacity="0.4" />
                    {idx % 2 === 0 && (
                      <>
                        <line x1={x + CARD_W + GAP_X / 2} y1={centerY} x2={x + CARD_W + GAP_X / 2} y2={nextCY} stroke="#C9A84C" strokeWidth="1.5" strokeOpacity="0.4" />
                        <line x1={x + CARD_W + GAP_X / 2} y1={nextCY} x2={x + CARD_W + GAP_X} y2={nextCY} stroke="#C9A84C" strokeWidth="1.5" strokeOpacity="0.4" />
                      </>
                    )}
                  </svg>
                )}
                {bye && realSlot ? (
                  <div style={{ position: "absolute", left: x, top: y, width: CARD_W, height: h, borderRadius: 8, overflow: "hidden", border: "1px dashed #D1C9B8", background: "linear-gradient(90deg,#FDFAF5,#F8F4EE)", display: "flex", alignItems: "center", padding: "0 10px", gap: 8 }}>
                    {realSlot.seed > 0 && realSlot.seed <= 16 && (
                      <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, background: "#C9A84C", color: "#1A3318" }}>{realSlot.seed}</div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A3318", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {groupStandings && realSlot.groupIdx !== undefined ? (() => {
                          const rm = realSlot.label.match(/^(\d+)/);
                          const rn = rm ? parseInt(rm[1]) - 1 : 0;
                          const e = groupStandings.get(realSlot.groupIdx)?.[rn];
                          return e ? e.player1Name : "TBD";
                        })() : "TBD"}
                      </div>
                      <div style={{ fontSize: 9, color: "#C9A84C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{realSlot.label}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>BYE ✓</span>
                  </div>
                ) : (
                  <div style={{ position: "absolute", left: x, top: y, width: CARD_W, height: h, borderRadius: 8, overflow: "hidden", border: isFinal ? "2px solid #C9A84C" : "1px solid #E8E0D0", boxShadow: isFinal ? "0 4px 20px rgba(201,168,76,0.25)" : "0 1px 4px rgba(0,0,0,0.07)", background: "white" }}>
                    <MatchSlot slot={match.slot1} groupStandings={groupStandings} />
                    <div style={{ height: 1, background: "#E8E0D0" }} />
                    <MatchSlot slot={match.slot2} groupStandings={groupStandings} />
                  </div>
                )}
              </div>
            );
          });
        })}
        {Object.entries(rounds).map(([roundStr]) => {
          const round = parseInt(roundStr);
          const isFinal = round === totalRounds - 1;
          const x = round * (CARD_W + GAP_X);
          return (
            <div key={`h${round}`} style={{ position: "absolute", left: x, top: 4, width: CARD_W, textAlign: "center" }}>
              <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 10px", borderRadius: 20, background: isFinal ? "#C9A84C" : "#F0EDE8", color: isFinal ? "#1A3318" : "#8A8070" }}>
                {getRoundLabel(round, totalRounds)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live Match Card ──────────────────────────────────────────────────────────
function LiveMatchCard({ match }: { match: StoredMatch }) {
  const s = match.state;
  const isLive = s.status === "GAME_IN_PROGRESS";
  const isDone = s.status === "MATCH_COMPLETED" || s.status === "FORFEITED";
  const score1 = s.games[s.currentGame]?.team1 ?? 0;
  const score2 = s.games[s.currentGame]?.team2 ?? 0;
  const completedGames = s.games.filter(g => g.winner);
  const wins1 = completedGames.filter(g => g.winner === "team1").length;
  const wins2 = completedGames.filter(g => g.winner === "team2").length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      border: isLive ? "1.5px solid rgba(201,168,76,0.5)" : "1px solid rgba(232,224,208,0.8)",
      background: isLive ? "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, white 100%)" : "white",
    }}>
      {/* Court + status header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: isLive ? "#1A3318" : "#F8F4EE", borderBottom: "1px solid rgba(232,224,208,0.6)" }}>
        <div className="flex items-center gap-2">
          {s.court && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ background: isLive ? "rgba(201,168,76,0.2)" : "rgba(26,51,24,0.08)", color: isLive ? "#C9A84C" : "#1A3318" }}>
              {s.court}
            </span>
          )}
          {s.groupName && (
            <span className="text-[10px]" style={{ color: isLive ? "rgba(255,255,255,0.4)" : "#8A8070" }}>{s.groupName}</span>
          )}
        </div>
        {isLive && (
          <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#C9A84C" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
          </span>
        )}
        {isDone && (
          <span className="text-[10px] font-semibold" style={{ color: "#16A34A" }}>✓ Done</span>
        )}
      </div>

      {/* Score */}
      <div className="px-3 py-2.5">
        {/* Team 1 */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold truncate" style={{ color: isDone && wins1 > wins2 ? "#1A3318" : "#1A3318" }}>
              {s.team1Name.split(" / ")[0]}
              {s.team1Name.includes(" / ") && (
                <span className="text-xs font-normal ml-1" style={{ color: "#8A8070" }}>& {s.team1Name.split(" / ")[1]}</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            {isLive ? (
              <span className="text-xl font-black tabular-nums" style={{ color: "#C9A84C" }}>{score1}</span>
            ) : isDone && completedGames.length > 0 ? (
              <span className="text-base font-bold tabular-nums" style={{ color: wins1 > wins2 ? "#C9A84C" : "#8A8070" }}>
                {completedGames.map(g => g.team1).join("–")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1 h-px" style={{ background: "rgba(232,224,208,0.6)" }} />
          <span className="text-[9px] font-semibold" style={{ color: "#8A8070" }}>VS</span>
          <div className="flex-1 h-px" style={{ background: "rgba(232,224,208,0.6)" }} />
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold truncate" style={{ color: "#1A3318" }}>
              {s.team2Name.split(" / ")[0]}
              {s.team2Name.includes(" / ") && (
                <span className="text-xs font-normal ml-1" style={{ color: "#8A8070" }}>& {s.team2Name.split(" / ")[1]}</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            {isLive ? (
              <span className="text-xl font-black tabular-nums" style={{ color: "#C9A84C" }}>{score2}</span>
            ) : isDone && completedGames.length > 0 ? (
              <span className="text-base font-bold tabular-nums" style={{ color: wins2 > wins1 ? "#C9A84C" : "#8A8070" }}>
                {completedGames.map(g => g.team2).join("–")}
              </span>
            ) : null}
          </div>
        </div>

        {/* Winner label for multi-game matches */}
        {isDone && completedGames.length > 1 && (
          <div className="mt-1.5 text-[10px] font-semibold text-center" style={{ color: "#8A8070" }}>
            {wins1 > wins2 ? `${s.team1Name.split(" / ")[0]} wins ${wins1}–${wins2}` : `${s.team2Name.split(" / ")[0]} wins ${wins2}–${wins1}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Group Standings Table (with live data) ───────────────────────────────────
function GroupStandingsTable({
  group,
  qualifiersPerGroup,
  standings,
}: {
  group: SavedGroup;
  qualifiersPerGroup: number;
  standings: StandingsEntry[];
}) {
  // Build a map from registrationId → standings entry
  // registrationId in standings = full teamName string e.g. "Player1 / Player2" or "Player1"
  const standingsMap = new Map<string, StandingsEntry>();
  for (const s of standings) {
    standingsMap.set(s.registrationId, s);
    // Also index by player1Name alone for singles fallback
    if (!standingsMap.has(s.player1Name)) standingsMap.set(s.player1Name, s);
  }

  // Helper: get standings entry for a draw team
  function getStandingsForTeam(t: SavedTeam): StandingsEntry | null {
    const fullName = t.player2 ? `${t.player1} / ${t.player2}` : t.player1;
    return standingsMap.get(fullName) ?? standingsMap.get(t.player1) ?? null;
  }

  // Sort teams by standings if available, else by seed
  const sortedTeams = [...group.teams].sort((a, b) => {
    const sa = getStandingsForTeam(a);
    const sb = getStandingsForTeam(b);
    if (sa && sb) {
      if (sb.points !== sa.points) return sb.points - sa.points;
      return (sb.gamesWon - sb.gamesLost) - (sa.gamesWon - sa.gamesLost);
    }
    if (sa) return -1;
    if (sb) return 1;
    return a.seed - b.seed;
  });

  const hasLiveData = standings.length > 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "#1A3318" }}>
        <h3 className="font-display font-bold text-sm text-white">{group.name}</h3>
        <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.7)" }}>{group.teams.length} teams</span>
      </div>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(232,224,208,0.5)", background: "#F8F4EE" }}>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>#</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Team</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>P</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>W</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>L</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map((t, i) => {
            const s = getStandingsForTeam(t);
            const qualifies = i < qualifiersPerGroup;
            return (
              <tr key={t.seed} style={{
                borderBottom: "1px solid rgba(232,224,208,0.4)",
                background: qualifies ? "rgba(45,90,39,0.04)" : "white",
              }}>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: qualifies ? "#C9A84C" : "#F8F4EE", color: qualifies ? "#1A3318" : "#8A8070", display: "inline-flex" }}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-xs font-semibold truncate" style={{ color: "#1A3318", maxWidth: 120 }}>{t.player1}</div>
                  {t.player2 && <div className="text-[10px] truncate" style={{ color: "#8A8070", maxWidth: 120 }}>{t.player2}</div>}
                </td>
                <td className="px-2 py-2.5 text-center text-xs font-semibold tabular-nums" style={{ color: "#8A8070" }}>
                  {s ? s.played : "—"}
                </td>
                <td className="px-2 py-2.5 text-center text-xs font-bold tabular-nums" style={{ color: "#16A34A" }}>
                  {s ? s.won : "—"}
                </td>
                <td className="px-2 py-2.5 text-center text-xs font-bold tabular-nums" style={{ color: "#DC2626" }}>
                  {s ? s.lost : "—"}
                </td>
                <td className="px-2 py-2.5 text-center text-xs font-bold tabular-nums" style={{ color: "#1A3318" }}>
                  {s ? s.points : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-1.5 text-[10px] flex items-center gap-1.5" style={{ background: "rgba(45,90,39,0.04)", color: "#8A8070" }}>
        {hasLiveData ? (
          <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live standings · Top {qualifiersPerGroup} advance</>
        ) : (
          <>✓ Top {qualifiersPerGroup} advance · Scores update live</>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TournamentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [groupView, setGroupView] = useState<"standings" | "cards">("standings");
  const [liveMatches, setLiveMatches] = useState<StoredMatch[]>([]);

  // Poll for live data every 3 seconds
  useEffect(() => {
    function refresh() {
      // Always recompute standings from match-store before reading tournament
      if (activeCatId) {
        recomputeStandings(id, activeCatId);
      }
      const t = getTournament(id);
      setTournament(t);
      if (t && activeCatId) {
        const matches = getMatchesForCategory(id, activeCatId);
        setLiveMatches(matches.filter(m =>
          m.state.status === "GAME_IN_PROGRESS" ||
          m.state.status === "MATCH_COMPLETED" ||
          m.state.status === "FORFEITED"
        ).sort((a, b) => {
          const order = (s: string) => s === "GAME_IN_PROGRESS" ? 0 : 1;
          return order(a.state.status) - order(b.state.status);
        }));
      }
    }
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [id, activeCatId]);

  // Set initial category
  useEffect(() => {
    const t = getTournament(id);
    if (t && t.categories.length > 0 && !activeCatId) {
      setActiveCatId(t.categories[0].id);
    }
  }, [id]);

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F4EE" }}>
        <p style={{ color: "#8A8070" }}>Tournament not found.</p>
      </div>
    );
  }

  const activeCategory = tournament.categories.find((c) => c.id === activeCatId);
  const hasOpenRegistration = tournament.categories.some((c) => c.registrationOpen);
  const statusCol = getTournamentStatusColor(tournament.status);

  // Parse bracket data if published
  let bracketMatches: BracketMatch[] = [];
  let bracketGroups: SavedGroup[] = [];
  let totalRounds = 0;
  if (activeCategory?.drawPublished && activeCategory.drawData) {
    try {
      const saved = JSON.parse(activeCategory.drawData);
      bracketMatches = saved.bracketMatches ?? [];
      bracketGroups = saved.groups ?? [];
      const N = (activeCategory.numGroups * activeCategory.qualifiersPerGroup);
      let size = 1;
      while (size < N) size *= 2;
      totalRounds = Math.log2(size);
    } catch { /* ignore */ }
  }

  // Build groupStandings map for knockout bracket — only include a group when ALL its matches are complete
  // Each group of N teams has N*(N-1)/2 total matches
  const groupStandingsMap: Map<number, StandingsEntry[]> | null = (() => {
    if (!activeCategory?.standings || activeCategory.standings.length === 0) return null;
    // Read all matches from match store to check completion per group
    const allCatMatches = getMatchesForCategory(id, activeCatId ?? "");
    const map = new Map<number, StandingsEntry[]>();
    bracketGroups.forEach((g, idx) => {
      const numTeams = g.teams.length;
      const totalGroupMatches = (numTeams * (numTeams - 1)) / 2;
      // Count completed matches for this group
      const completedGroupMatches = allCatMatches.filter(m =>
        m.state.groupName === g.name &&
        (m.state.status === "MATCH_COMPLETED" || m.state.status === "FORFEITED")
      ).length;
      // Only include this group in bracket map when all matches are done
      if (completedGroupMatches < totalGroupMatches) return;
      const groupTeamNames = new Set(
        g.teams.map(t => t.player2 ? `${t.player1} / ${t.player2}` : t.player1)
      );
      const groupStandings = (activeCategory.standings ?? [])
        .filter(s => groupTeamNames.has(s.registrationId) || groupTeamNames.has(s.player1Name))
        .sort((a, b) => b.points - a.points || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
      if (groupStandings.length > 0) map.set(idx, groupStandings);
    });
    return map.size > 0 ? map : null;
  })();

  // Registration count per category
  const regsByCat = (catId: string) => (tournament.registrations ?? []).filter((r) => r.categoryId === catId);

  // Live match count for active category
  const liveCount = liveMatches.filter(m => m.state.status === "GAME_IN_PROGRESS").length;

  return (
    <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
      {/* Hero banner */}
      <div className="relative" style={{ background: "#1A3318", minHeight: 240 }}>
        {tournament.bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tournament.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link href="/tournaments" className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.4)" }}>
            <ChevronLeft size={14} /> All Tournaments
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: statusCol.bg, color: statusCol.text }}>
                  {getTournamentStatusLabel(tournament.status)}
                </span>
                {liveCount > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(201,168,76,0.2)", color: "#C9A84C" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {liveCount} Live
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white">{tournament.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {tournament.city && (
                  <span className="flex items-center gap-1.5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <MapPin size={13} style={{ color: "rgba(201,168,76,0.6)" }} /> {tournament.city}{tournament.venue ? ` · ${tournament.venue}` : ""}
                  </span>
                )}
                {tournament.startDate && (
                  <span className="flex items-center gap-1.5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <Calendar size={13} style={{ color: "rgba(201,168,76,0.6)" }} /> {tournament.startDate}{tournament.endDate ? ` – ${tournament.endDate}` : ""}
                  </span>
                )}
                {tournament.prize && (
                  <span className="text-sm font-bold" style={{ color: "#C9A84C" }}>{formatPrize(tournament.prize)}</span>
                )}
              </div>
            </div>
            {hasOpenRegistration && (
              <Link href={`/tournaments/${id}/register`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] flex-shrink-0"
                style={{ background: "#C9A84C", color: "#1A3318" }}>
                <Users size={16} /> Register Now
              </Link>
            )}
          </div>
          {tournament.description && (
            <p className="mt-3 text-sm max-w-2xl" style={{ color: "rgba(255,255,255,0.55)" }}>{tournament.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="lg:col-span-3">
            {tournament.categories.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <Trophy size={32} style={{ color: "#C9A84C", margin: "0 auto 12px" }} />
                <p className="text-sm" style={{ color: "#8A8070" }}>No categories have been set up yet.</p>
              </div>
            ) : (
              <div>
                {/* Category tabs */}
                <div className="flex gap-2 flex-wrap mb-6">
                  {tournament.categories.map((cat) => {
                    const catRegs = regsByCat(cat.id);
                    const approvedCount = catRegs.filter((r) => r.status === "approved").length;
                    return (
                      <button key={cat.id} onClick={() => setActiveCatId(cat.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={activeCatId === cat.id
                          ? { background: "#1A3318", color: "white" }
                          : { background: "white", color: "#1A3318", border: "1px solid rgba(232,224,208,0.8)" }}>
                        {cat.name}
                        {cat.drawPublished
                          ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#F0FDF4", color: "#16A34A" }}>Draw Live</span>
                          : cat.registrationOpen
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#F0FDF4", color: "#16A34A" }}>
                                Open{approvedCount > 0 ? ` · ${approvedCount}` : ""}
                              </span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#F8F4EE", color: "#8A8070" }}>Pending</span>
                        }
                      </button>
                    );
                  })}
                </div>

                {/* Active category content */}
                {activeCategory && (
                  <div>
                    {activeCategory.drawPublished ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2">
                            <Globe size={14} style={{ color: "#16A34A" }} />
                            <span className="text-sm font-semibold" style={{ color: "#16A34A" }}>Draw Published</span>
                            <span className="text-xs" style={{ color: "#8A8070" }}>· {activeCategory.scoringFormat}</span>
                            {liveCount > 0 && (
                              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {liveCount} live
                              </span>
                            )}
                          </div>
                          {bracketGroups.length > 0 && (
                            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#F0EDE8" }}>
                              <button onClick={() => setGroupView("standings")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={groupView === "standings" ? { background: "white", color: "#1A3318", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "#8A8070" }}>
                                Standings
                              </button>
                              <button onClick={() => setGroupView("cards")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={groupView === "cards" ? { background: "white", color: "#1A3318", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "#8A8070" }}>
                                Groups
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Live Matches Section */}
                        {liveMatches.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Activity size={16} style={{ color: "#C9A84C" }} />
                              <h2 className="font-display text-lg font-bold" style={{ color: "#1A3318" }}>
                                {liveCount > 0 ? "Live Matches" : "Recent Results"}
                              </h2>
                              {liveCount > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {liveCount} on court
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {liveMatches.slice(0, 9).map(m => (
                                <LiveMatchCard key={m.state.matchId} match={m} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Group stage */}
                        {bracketGroups.length > 0 && (
                          <div>
                            <h2 className="font-display text-xl font-bold mb-4" style={{ color: "#1A3318" }}>Group Stage</h2>

                            {groupView === "standings" ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {bracketGroups.map((g) => {
                                  // standings.registrationId = teamName (the full "Player1 / Player2" string)
                                  // draw group teams have player1 + optional player2
                                  // Match by constructing the same teamName key
                                  const groupTeamNames = new Set(
                                    g.teams.map(t => t.player2 ? `${t.player1} / ${t.player2}` : t.player1)
                                  );
                                  const groupStandings = (activeCategory.standings ?? []).filter(s =>
                                    groupTeamNames.has(s.registrationId) || groupTeamNames.has(s.player1Name)
                                  );
                                  return (
                                    <GroupStandingsTable
                                      key={g.name}
                                      group={g}
                                      qualifiersPerGroup={activeCategory.qualifiersPerGroup}
                                      standings={groupStandings}
                                    />
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {bracketGroups.map((g) => (
                                  <div key={g.name} className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                                    <div className="px-4 py-2.5" style={{ background: "#1A3318" }}>
                                      <h3 className="font-display font-bold text-sm text-white">{g.name}</h3>
                                    </div>
                                    <div className="divide-y" style={{ borderColor: "rgba(232,224,208,0.5)" }}>
                                      {g.teams.map((t, i) => (
                                        <div key={t.seed} className="px-4 py-2.5 flex items-center gap-2"
                                          style={{ background: i < activeCategory.qualifiersPerGroup ? "rgba(45,90,39,0.03)" : "white" }}>
                                          <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: t.seed <= 4 ? "#C9A84C" : "#F8F4EE", color: t.seed <= 4 ? "#1A3318" : "#8A8070" }}>
                                            {t.seed}
                                          </span>
                                          <div className="min-w-0">
                                            <div className="text-xs font-semibold truncate" style={{ color: "#1A3318" }}>{t.player1}</div>
                                            {t.player2 && <div className="text-[10px] truncate" style={{ color: "#8A8070" }}>{t.player2}</div>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="px-4 py-1.5 text-[10px]" style={{ background: "rgba(45,90,39,0.04)", color: "#8A8070" }}>
                                      ✓ Top {activeCategory.qualifiersPerGroup} advance
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Knockout bracket */}
                        {bracketMatches.length > 0 && (
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>Knockout Bracket</h2>
                              {(() => {
                              // How many groups are fully complete?
                              const allCatMatchesForBracket = getMatchesForCategory(id, activeCatId ?? "");
                              const completedGroups = bracketGroups.filter(g => {
                                const total = (g.teams.length * (g.teams.length - 1)) / 2;
                                const done = allCatMatchesForBracket.filter(m =>
                                  m.state.groupName === g.name &&
                                  (m.state.status === "MATCH_COMPLETED" || m.state.status === "FORFEITED")
                                ).length;
                                return done >= total;
                              }).length;
                              const allDone = completedGroups === bracketGroups.length;
                              return allDone ? (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#F0FDF4", color: "#16A34A" }}>
                                  ✓ All qualifiers set
                                </span>
                              ) : completedGroups > 0 ? (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#FEF3C7", color: "#D97706" }}>
                                  {completedGroups}/{bracketGroups.length} groups done
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#F8F4EE", color: "#8A8070" }}>
                                  Awaiting group stage
                                </span>
                              );
                            })()}
                            </div>
                            <div className="bg-white rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                              <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#1A3318" }}>
                                <Trophy size={18} style={{ color: "#C9A84C" }} />
                                <span className="font-display font-bold text-white">{activeCategory.name}</span>
                              </div>
                              <div className="p-6" style={{ background: "#FDFAF5" }}>
                                <WimbledonBracket
                                  matches={bracketMatches}
                                  totalRounds={totalRounds}
                                  groupStandings={groupStandingsMap}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-3xl p-16 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F8F4EE" }}>
                          <Lock size={28} style={{ color: "#8A8070" }} />
                        </div>
                        <h3 className="font-display text-xl font-bold mb-2" style={{ color: "#1A3318" }}>Draw Not Published Yet</h3>
                        <p className="text-sm max-w-sm mx-auto" style={{ color: "#8A8070" }}>
                          The draw for <strong>{activeCategory.name}</strong> hasn&apos;t been published yet. Check back soon!
                        </p>
                        {activeCategory.registrationOpen && (
                          <Link href={`/tournaments/${id}/register`}
                            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-2xl font-bold text-sm"
                            style={{ background: "#C9A84C", color: "#1A3318" }}>
                            <Users size={14} /> Register for {activeCategory.name}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
              <h3 className="font-display font-bold mb-4" style={{ color: "#1A3318" }}>Tournament Info</h3>
              <div className="space-y-3 text-sm">
                {tournament.startDate && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8A8070" }}>Dates</div>
                    <div style={{ color: "#1A3318" }}>{tournament.startDate}{tournament.endDate ? ` – ${tournament.endDate}` : ""}</div>
                  </div>
                )}
                {tournament.registrationDeadline && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8A8070" }}>Registration Deadline</div>
                    <div style={{ color: "#1A3318" }}>{tournament.registrationDeadline}</div>
                  </div>
                )}
                {tournament.venue && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8A8070" }}>Venue</div>
                    <div style={{ color: "#1A3318" }}>{tournament.venue}{tournament.city ? `, ${tournament.city}` : ""}</div>
                  </div>
                )}
                {tournament.prize && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8A8070" }}>Prize Pool</div>
                    <div className="font-bold" style={{ color: "#C9A84C" }}>{formatPrize(tournament.prize)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
              <h3 className="font-display font-bold mb-3" style={{ color: "#1A3318" }}>Categories</h3>
              <div className="space-y-2">
                {tournament.categories.map((cat) => {
                  const catRegs = regsByCat(cat.id);
                  const approvedCount = catRegs.filter((r) => r.status === "approved").length;
                  return (
                    <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: "#F8F4EE" }}>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: "#1A3318" }}>{cat.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cat.entryFee && <span className="text-[10px]" style={{ color: "#C9A84C" }}>₹{cat.entryFee}</span>}
                          {cat.maxTeams ? (
                            <span className="text-[10px] font-semibold" style={{ color: approvedCount >= cat.maxTeams ? "#DC2626" : approvedCount >= cat.maxTeams * 0.8 ? "#D97706" : "#16A34A" }}>
                              {approvedCount}/{cat.maxTeams} filled
                            </span>
                          ) : approvedCount > 0 ? (
                            <span className="text-[10px]" style={{ color: "#8A8070" }}>{approvedCount} registered</span>
                          ) : null}
                        </div>
                        {cat.maxTeams ? (
                          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(232,224,208,0.8)" }}>
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${Math.min(100, (approvedCount / cat.maxTeams) * 100)}%`,
                              background: approvedCount >= cat.maxTeams ? "#DC2626" : approvedCount >= cat.maxTeams * 0.8 ? "#D97706" : "#16A34A"
                            }} />
                          </div>
                        ) : null}
                      </div>
                      {cat.drawPublished
                        ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#F0FDF4", color: "#16A34A" }}>Draw Live</span>
                        : cat.registrationOpen
                          ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#F0FDF4", color: "#16A34A" }}>Open</span>
                          : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#F3F4F6", color: "#6B7280" }}>Closed</span>
                      }
                    </div>
                  );
                })}
              </div>
              {hasOpenRegistration && (
                <Link href={`/tournaments/${id}/register`}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: "#C9A84C", color: "#1A3318" }}>
                  <Users size={14} /> Register Now
                </Link>
              )}
            </div>

            {(tournament.contactEmail || tournament.contactPhone) && (
              <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <h3 className="font-display font-bold mb-3" style={{ color: "#1A3318" }}>Contact</h3>
                <div className="space-y-2">
                  {tournament.contactEmail && (
                    <a href={`mailto:${tournament.contactEmail}`} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#1A3318" }}>
                      <Mail size={13} style={{ color: "#8A8070" }} /> {tournament.contactEmail}
                    </a>
                  )}
                  {tournament.contactPhone && (
                    <a href={`tel:${tournament.contactPhone}`} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#1A3318" }}>
                      <Phone size={13} style={{ color: "#8A8070" }} /> {tournament.contactPhone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
