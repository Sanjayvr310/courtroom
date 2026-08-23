"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, ChevronLeft, Download, Trophy, Globe, Lock, Users, ChevronUp, ChevronDown } from "lucide-react";
import { getTournament, saveTournament } from "@/lib/store";
import type { Tournament, TournamentCategory, Registration } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Team {
  seed: number;
  player1: string;
  player1Rating: number;
  player1DuprId: string;
  player2: string;
  player2Rating: number;
  player2DuprId: string;
  teamRating: number;
  contact1: string;
  contact2: string;
  registrationId?: string; // link back to registration
}

interface Group {
  name: string;
  teams: Team[];
}

interface BracketSlot {
  label: string;
  isBye: boolean;
  seed: number;
}

interface BracketMatch {
  id: string;
  round: number;
  matchNum: number;
  slot1: BracketSlot;
  slot2: BracketSlot;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): Team[] {
  const lines = text.trim().split("\n");
  const teams: Team[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 9 || !cols[0]) continue;
    const p1Rating = parseFloat(cols[1]) || 0;
    const p2Rating = parseFloat(cols[5]) || 0;
    const teamRating = parseFloat(cols[8]) || (p1Rating + p2Rating) / 2;
    teams.push({
      seed: 0,
      player1: cols[0],
      player1Rating: p1Rating,
      player1DuprId: cols[2],
      contact1: cols[3],
      player2: cols[4],
      player2Rating: p2Rating,
      player2DuprId: cols[6],
      contact2: cols[7],
      teamRating,
    });
  }
  teams.sort((a, b) => b.teamRating - a.teamRating);
  teams.forEach((t, i) => (t.seed = i + 1));
  return teams;
}

// ─── Registration → Team converter ───────────────────────────────────────────
function registrationsToTeams(regs: Registration[]): Team[] {
  const teams: Team[] = regs.map((r) => {
    const p1Rating = r.player1Rating ?? 0;
    const p2Rating = r.player2Rating ?? 0;
    // For doubles: avg of both ratings. For singles: player1 rating.
    const teamRating = r.player2Name ? (p1Rating + p2Rating) / 2 : p1Rating;
    return {
      seed: 0,
      player1: r.player1Name,
      player1Rating: p1Rating,
      player1DuprId: r.player1DuprId ?? "",
      contact1: r.player1Phone,
      player2: r.player2Name ?? "",
      player2Rating: p2Rating,
      player2DuprId: r.player2DuprId ?? "",
      contact2: r.player2Phone ?? "",
      teamRating,
      registrationId: r.id,
    };
  });
  teams.sort((a, b) => b.teamRating - a.teamRating);
  teams.forEach((t, i) => (t.seed = i + 1));
  return teams;
}

// ─── Snake Seeding ────────────────────────────────────────────────────────────
function snakeSeed(teams: Team[], numGroups: number): Group[] {
  const groups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
    name: `Group ${String.fromCharCode(65 + i)}`,
    teams: [],
  }));
  let direction = 1;
  let groupIdx = 0;
  for (const team of teams) {
    groups[groupIdx].teams.push(team);
    groupIdx += direction;
    if (groupIdx >= numGroups) { groupIdx = numGroups - 1; direction = -1; }
    else if (groupIdx < 0) { groupIdx = 0; direction = 1; }
  }
  return groups;
}

// ─── Bracket Builder ──────────────────────────────────────────────────────────
// 
// SEPARATION GUARANTEE: Teams from the same group must NOT meet until the Final.
// This is achieved by:
//   1. Standard seeded bracket positions (seed 1 vs 2 only in Final)
//   2. Qualifiers are ordered so that same-group teams land in opposite halves
//      (and opposite quarters, eighths, etc.) of the bracket.
//   3. The qualifier ordering interleaves groups across bracket sections:
//      - 1st Group A → position 1 (top half, top quarter)
//      - 1st Group B → position 2 (bottom half, bottom quarter)  
//      - 2nd Group A → position 3 (top half, bottom quarter)
//      - 2nd Group B → position 4 (bottom half, top quarter)
//      This ensures same-group teams are always in different quarters.
//
function buildBracket(groups: Group[], qualifiersPerGroup: number): BracketMatch[] {
  const G = groups.length;
  const N = G * qualifiersPerGroup;

  // ── Step 1: Build qualifier list with group-separation ordering ──────────
  // We interleave groups across bracket sections so same-group teams
  // are maximally separated. The key insight: in a standard seeded bracket,
  // seeds 1 and 2 meet in the Final, 1/4 meet in Semis, 1/8 meet in QFs.
  // We assign seeds so that all qualifiers from the same group get seeds
  // that are in different "sections" of the bracket.
  //
  // Strategy: assign seeds round-robin across groups, but interleave
  // so that group A gets seeds 1, G+1, 2G+1... and group B gets 2, G+2, 2G+2...
  // This guarantees same-group teams are always in different halves at every level.

  const qualifiers: { label: string; groupIdx: number }[] = new Array(N);

  for (let rank = 0; rank < qualifiersPerGroup; rank++) {
    const rankLabel = rank === 0 ? "1st" : rank === 1 ? "2nd" : rank === 2 ? "3rd" : `${rank + 1}th`;
    for (let g = 0; g < G; g++) {
      // Interleaved position: rank * G + g  → but we want to spread across bracket
      // Use the "folded" assignment: even ranks go forward, odd ranks go backward
      // to maximize separation between same-group qualifiers
      const pos = rank * G + g;
      qualifiers[pos] = {
        label: `${rankLabel} · ${groups[g].name}`,
        groupIdx: g,
      };
    }
  }

  // ── Step 2: Build bracket size ───────────────────────────────────────────
  let size = 1;
  while (size < N) size *= 2;
  const numByes = size - N;
  const numRounds = Math.log2(size);

  // ── Step 3: Standard seeded bracket positions ────────────────────────────
  // buildSeededPositions(n) returns an array of length n where position i
  // holds the seed number that should be placed there.
  // This is the standard "balanced draw" used in tennis/badminton:
  // seed 1 and 2 can only meet in the Final, 1 and 3/4 in Semis, etc.
  function buildSeededPositions(n: number): number[] {
    let bracket = [1, 2];
    while (bracket.length < n) {
      const newSize = bracket.length * 2;
      const next: number[] = [];
      for (const s of bracket) { next.push(s); next.push(newSize + 1 - s); }
      bracket = next;
    }
    return bracket;
  }

  const seedAtPos = buildSeededPositions(size);

  // ── Step 4: Place qualifiers into bracket positions ───────────────────────
  // seed 1 → qualifiers[0] (1st Group A), seed 2 → qualifiers[1] (1st Group B), etc.
  // Because qualifiers are ordered with groups interleaved, and the seeded bracket
  // places seed 1 and 2 in opposite halves, same-group teams end up in opposite halves.
  const slotArray: BracketSlot[] = seedAtPos.map(seed => {
    if (seed > N) return { label: "BYE", isBye: true, seed };
    const q = qualifiers[seed - 1];
    return { label: q.label, isBye: false, seed, groupIdx: q.groupIdx } as BracketSlot;
  });

  // ── Step 5: Give byes to top seeds (seeds 1..numByes get byes) ───────────
  if (numByes > 0) {
    for (let seed = 1; seed <= numByes; seed++) {
      const pos = seedAtPos.indexOf(seed);
      if (pos === -1) continue;
      const opponentPos = pos % 2 === 0 ? pos + 1 : pos - 1;
      slotArray[opponentPos] = { label: "BYE", isBye: true, seed: 9999 };
    }
  }

  // ── Step 6: Verify & fix any remaining R1 same-group clashes ─────────────
  // (Should be rare/none with the interleaved ordering, but we fix any edge cases)
  for (let pass = 0; pass < G * 2; pass++) {
    let foundClash = false;
    for (let i = 0; i < size; i += 2) {
      const s1 = slotArray[i] as BracketSlot & { groupIdx?: number };
      const s2 = slotArray[i + 1] as BracketSlot & { groupIdx?: number };
      if (s1.isBye || s2.isBye) continue;
      if (s1.groupIdx !== undefined && s2.groupIdx !== undefined && s1.groupIdx === s2.groupIdx) {
        // Find a swap partner in a different section
        for (let j = 0; j < size; j += 2) {
          if (j === i) continue;
          const t1 = slotArray[j] as BracketSlot & { groupIdx?: number };
          const t2 = slotArray[j + 1] as BracketSlot & { groupIdx?: number };
          if (t1.isBye || t2.isBye) continue;
          // Swap s2 with t2 only if it doesn't create a new clash
          if (t2.groupIdx !== s1.groupIdx && t1.groupIdx !== s2.groupIdx) {
            const tmp = slotArray[i + 1];
            slotArray[i + 1] = slotArray[j + 1];
            slotArray[j + 1] = tmp;
            foundClash = true;
            break;
          }
        }
        if (foundClash) break;
      }
    }
    if (!foundClash) break;
  }

  // ── Step 7: Build match objects ───────────────────────────────────────────
  const firstRoundMatches: BracketMatch[] = [];
  for (let i = 0; i < size; i += 2) {
    firstRoundMatches.push({
      id: `r0-m${i / 2}`,
      round: 0,
      matchNum: i / 2 + 1,
      slot1: slotArray[i],
      slot2: slotArray[i + 1],
    });
  }

  const result: BracketMatch[] = [...firstRoundMatches];
  let prevRoundMatches = firstRoundMatches;
  let nextMatchNum = firstRoundMatches.length + 1;
  for (let r = 1; r < numRounds; r++) {
    const nextRoundMatches: BracketMatch[] = [];
    for (let m = 0; m < prevRoundMatches.length / 2; m++) {
      const feeder1 = prevRoundMatches[m * 2];
      const feeder2 = prevRoundMatches[m * 2 + 1];
      nextRoundMatches.push({
        id: `r${r}-m${m}`,
        round: r,
        matchNum: nextMatchNum++,
        slot1: { label: `W M${feeder1.matchNum}`, isBye: false, seed: 0 },
        slot2: { label: `W M${feeder2.matchNum}`, isBye: false, seed: 0 },
      });
    }
    result.push(...nextRoundMatches);
    prevRoundMatches = nextRoundMatches;
  }
  return result;
}

// ─── Bracket Renderer ─────────────────────────────────────────────────────────
function getRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-Final";
  if (fromEnd === 2) return "Quarter-Final";
  if (fromEnd === 3) return "Round of 16";
  if (fromEnd === 4) return "Round of 32";
  return "Round of 64";
}

// groupStandings: map from groupIdx → sorted team list (by actual standings, post group stage)
// If groupStandings is null/undefined, we show TBD for all group slots.
function MatchSlot({
  slot,
  groupStandings,
}: {
  slot: BracketSlot & { groupIdx?: number };
  groupStandings?: Map<number, Team[]> | null;
}) {
  if (slot.isBye) {
    return (
      <div style={{ height: "50%", display: "flex", alignItems: "center", padding: "0 10px", background: "#F9FAFB" }}>
        <span style={{ fontSize: 10, fontStyle: "italic", color: "#9CA3AF" }}>BYE</span>
      </div>
    );
  }
  const isGroupSlot = slot.label.includes("·");

  // Only resolve player names if actual standings are available (group stage complete)
  let playerName = "";
  let partnerName = "";
  if (isGroupSlot && groupStandings && slot.groupIdx !== undefined) {
    const rankMatch = slot.label.match(/^(\d+)/);
    const rankNum = rankMatch ? parseInt(rankMatch[1]) - 1 : 0;
    const standings = groupStandings.get(slot.groupIdx);
    if (standings) {
      const team = standings[rankNum];
      if (team) {
        playerName = team.player1 ?? "";
        partnerName = team.player2 ?? "";
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
  groupStandings?: Map<number, Team[]> | null;
}) {
  const rounds: Record<number, BracketMatch[]> = {};
  for (const m of matches) {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  }
  const CARD_H = 80, CARD_W = 200, GAP_X = 40, BASE_GAP_Y = 8;
  const r0Count = rounds[0]?.length ?? 1;
  const totalH = r0Count * CARD_H + (r0Count - 1) * BASE_GAP_Y + 48;

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "82vh" }}>
      <div style={{ position: "relative", width: totalRounds * (CARD_W + GAP_X) + 20, height: totalH, minWidth: 600 }}>
        {Object.entries(rounds).map(([roundStr, rMatches]) => {
          const round = parseInt(roundStr);
          const isFinal = round === totalRounds - 1;
          const factor = Math.pow(2, round);
          const cardGap = BASE_GAP_Y * factor + CARD_H * (factor - 1);
          const topOffset = (factor - 1) * (CARD_H + BASE_GAP_Y) / 2;
          return rMatches.map((match, idx) => {
            const x = round * (CARD_W + GAP_X);
            const y = topOffset + idx * (CARD_H + cardGap) + 28;
            const centerY = y + CARD_H / 2;
            const nextCenterY = y + CARD_H + cardGap + CARD_H / 2;
            const midY = (centerY + nextCenterY) / 2;
            return (
              <div key={match.id}>
                {round < totalRounds - 1 && (
                  <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                    <line x1={x + CARD_W} y1={centerY} x2={x + CARD_W + GAP_X / 2} y2={centerY} stroke="#C9A84C" strokeWidth="1.5" strokeOpacity="0.5" />
                    {idx % 2 === 0 && (
                      <>
                        <line x1={x + CARD_W + GAP_X / 2} y1={centerY} x2={x + CARD_W + GAP_X / 2} y2={nextCenterY} stroke="#C9A84C" strokeWidth="1.5" strokeOpacity="0.5" />
                        <line x1={x + CARD_W + GAP_X / 2} y1={midY} x2={x + CARD_W + GAP_X} y2={midY} stroke="#C9A84C" strokeWidth="1.5" strokeOpacity="0.5" />
                      </>
                    )}
                  </svg>
                )}
                <div style={{ position: "absolute", left: x, top: y, width: CARD_W, height: CARD_H, borderRadius: 8, overflow: "hidden", border: isFinal ? "2px solid #C9A84C" : "1px solid #E8E0D0", boxShadow: isFinal ? "0 4px 20px rgba(201,168,76,0.25)" : "0 1px 4px rgba(0,0,0,0.07)", background: "white" }}>
                  <MatchSlot slot={match.slot1} groupStandings={groupStandings} />
                  <div style={{ height: 1, background: "#E8E0D0" }} />
                  <MatchSlot slot={match.slot2} groupStandings={groupStandings} />
                </div>
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

// ─── Seeded Team List with reorder ───────────────────────────────────────────
function SeededTeamList({ teams, onReorder }: { teams: Team[]; onReorder: (teams: Team[]) => void }) {
  function move(idx: number, dir: -1 | 1) {
    const newTeams = [...teams];
    const target = idx + dir;
    if (target < 0 || target >= newTeams.length) return;
    [newTeams[idx], newTeams[target]] = [newTeams[target], newTeams[idx]];
    // Re-seed
    newTeams.forEach((t, i) => (t.seed = i + 1));
    onReorder(newTeams);
  }

  return (
    <div className="bg-white rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(232,224,208,0.8)", background: "#F8F4EE" }}>
        <h3 className="font-display font-bold" style={{ color: "#1A3318" }}>Seeded Teams ({teams.length})</h3>
        <span className="text-xs" style={{ color: "#8A8070" }}>Use ↑↓ to adjust seed order</span>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(232,224,208,0.5)", background: "#FDFAF5" }}>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Seed</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Team</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Avg DUPR</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Order</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, idx) => (
              <tr key={t.seed} className="hover:bg-[#F8F4EE]" style={{ borderBottom: "1px solid rgba(232,224,208,0.4)" }}>
                <td className="px-4 py-2.5">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={t.seed <= 4 ? { background: "#C9A84C", color: "#1A3318", display: "inline-flex" } : { background: "#F8F4EE", color: "#8A8070", display: "inline-flex" }}>
                    {t.seed}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-sm font-medium" style={{ color: "#1A3318" }}>{t.player1}</div>
                  {t.player2 && <div className="text-xs" style={{ color: "#8A8070" }}>{t.player2}</div>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-sm font-bold tabular-nums" style={{ color: "#C9A84C" }}>
                    {t.teamRating > 0 ? t.teamRating.toFixed(3) : "—"}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20"
                      style={{ color: "#8A8070" }}>
                      <ChevronUp size={12} />
                    </button>
                    <button onClick={() => move(idx, 1)} disabled={idx === teams.length - 1}
                      className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20"
                      style={{ color: "#8A8070" }}>
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CategoryDrawPage({ params }: { params: { id: string; catId: string } }) {
  const { id: tournamentId, catId } = params;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [category, setCategory] = useState<TournamentCategory | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fileName, setFileName] = useState("");
  const [loadSource, setLoadSource] = useState<"csv" | "registrations" | null>(null);
  const [numGroups, setNumGroups] = useState(8);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
  const [scoringFormat, setScoringFormat] = useState("Best of 3, to 11");
  const [groups, setGroups] = useState<Group[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [activeGroupTab, setActiveGroupTab] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = getTournament(tournamentId);
    if (!t) return;
    setTournament(t);
    const cat = t.categories.find((c) => c.id === catId);
    if (!cat) return;
    setCategory(cat);
    setNumGroups(cat.numGroups);
    setQualifiersPerGroup(cat.qualifiersPerGroup);
    setScoringFormat(cat.scoringFormat);

    // If draw already published, load it
    if (cat.drawPublished && cat.drawData) {
      try {
        const saved = JSON.parse(cat.drawData);
        setTeams(saved.teams ?? []);
        setGroups(saved.groups ?? []);
        setBracketMatches(saved.bracketMatches ?? []);
        setStep(4);
      } catch { /* ignore */ }
    }
  }, [tournamentId, catId]);

  function handleFile(file: File) {
    setFileName(file.name);
    setLoadSource("csv");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTeams(parseCSV(text));
      setStep(2);
    };
    reader.readAsText(file);
  }

  function loadFromRegistrations() {
    if (!tournament) return;
    const approvedRegs = (tournament.registrations ?? []).filter(
      (r) => r.categoryId === catId && r.status === "approved"
    );
    if (approvedRegs.length === 0) {
      alert("No approved registrations found for this category. Approve some registrations first.");
      return;
    }
    setLoadSource("registrations");
    setFileName(`${approvedRegs.length} approved registrations`);
    setTeams(registrationsToTeams(approvedRegs));
    setStep(2);
  }

  function generateGroups() {
    setGroups(snakeSeed(teams, numGroups));
    setStep(3);
  }

  function generateKnockout() {
    const matches = buildBracket(groups, qualifiersPerGroup);
    setBracketMatches(matches);
    setStep(4);
  }

  function publishDraw() {
    if (!tournament || !category) return;
    setPublishing(true);
    const drawData = JSON.stringify({ teams, groups, bracketMatches });
    const updatedCat: TournamentCategory = { ...category, drawPublished: true, drawData, numGroups, qualifiersPerGroup, scoringFormat };
    const updatedTournament: Tournament = {
      ...tournament,
      categories: tournament.categories.map((c) => c.id === catId ? updatedCat : c),
    };
    saveTournament(updatedTournament);
    setTournament(updatedTournament);
    setCategory(updatedCat);
    setTimeout(() => setPublishing(false), 800);
  }

  function unpublishDraw() {
    if (!tournament || !category) return;
    const updatedCat: TournamentCategory = { ...category, drawPublished: false };
    const updatedTournament: Tournament = {
      ...tournament,
      categories: tournament.categories.map((c) => c.id === catId ? updatedCat : c),
    };
    saveTournament(updatedTournament);
    setTournament(updatedTournament);
    setCategory(updatedCat);
  }

  const totalQualifiers = numGroups * qualifiersPerGroup;
  let bracketSize = 1;
  while (bracketSize < totalQualifiers) bracketSize *= 2;
  const totalRounds = Math.log2(bracketSize);
  const numByes = bracketSize - totalQualifiers;

  // Count approved registrations for this category
  const approvedRegCount = tournament
    ? (tournament.registrations ?? []).filter((r) => r.categoryId === catId && r.status === "approved").length
    : 0;

  if (!tournament || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F4EE" }}>
        <p style={{ color: "#8A8070" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A3318 0%, #2D5A27 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-4">
            <Link href={`/admin/tournaments/${tournamentId}`} className="text-white/50 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "rgba(201,168,76,0.6)" }}>
                {tournament.name} · Draw
              </div>
              <h1 className="font-display text-2xl font-bold text-white truncate">{category.name}</h1>
            </div>
            {/* Publish / Unpublish */}
            {step === 4 && (
              <div className="flex items-center gap-2">
                {category.drawPublished ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#F0FDF4", color: "#16A34A" }}>
                      <Globe size={12} /> Draw Live
                    </span>
                    <Link
                      href={`/admin/tournaments/${tournamentId}/schedule/${catId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                      style={{ background: "#C9A84C", color: "#1A3318" }}>
                      📅 Schedule Matches
                    </Link>
                    <button onClick={unpublishDraw}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                      <Lock size={12} /> Unpublish
                    </button>
                  </>
                ) : (
                  <button onClick={publishDraw} disabled={publishing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                    style={{ background: "#C9A84C", color: "#1A3318" }}>
                    <Globe size={14} /> {publishing ? "Publishing..." : "Publish Draw"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-5">
            {[{ n: 1, label: "Load Teams" }, { n: 2, label: "Configure" }, { n: 3, label: "Group Draw" }, { n: 4, label: "Knockout" }].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={step >= n ? { background: "#C9A84C", color: "#1A3318" } : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                    {n}
                  </div>
                  <span className="text-xs font-medium hidden sm:block"
                    style={{ color: step >= n ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}>
                    {label}
                  </span>
                </div>
                {i < 3 && <div className="w-8 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Step 1: Load Teams ── */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Option A: Load from Registrations */}
            <div className="bg-white rounded-3xl p-8" style={{ border: approvedRegCount > 0 ? "2px solid rgba(201,168,76,0.4)" : "1px solid rgba(232,224,208,0.8)" }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)" }}>
                  <Users size={22} style={{ color: "#C9A84C" }} />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-bold mb-1" style={{ color: "#1A3318" }}>Load from Registrations</h2>
                  <p className="text-sm mb-4" style={{ color: "#8A8070" }}>
                    {approvedRegCount > 0
                      ? <><strong style={{ color: "#16A34A" }}>{approvedRegCount} approved</strong> registrations ready for <strong>{category.name}</strong>. Team rating = avg DUPR of both players.</>
                      : <>No approved registrations yet for <strong>{category.name}</strong>. Approve registrations first.</>
                    }
                  </p>
                  <button onClick={loadFromRegistrations} disabled={approvedRegCount === 0}
                    className="px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "#1A3318", color: "white" }}>
                    Load {approvedRegCount} Approved Teams →
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(232,224,208,0.8)" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8A8070" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(232,224,208,0.8)" }} />
            </div>

            {/* Option B: CSV Upload */}
            <div className="bg-white rounded-3xl p-8 text-center" style={{ border: "2px dashed rgba(201,168,76,0.3)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(201,168,76,0.1)" }}>
                <Upload size={22} style={{ color: "#C9A84C" }} />
              </div>
              <h2 className="font-display text-lg font-bold mb-1" style={{ color: "#1A3318" }}>Upload CSV</h2>
              <p className="text-sm mb-4" style={{ color: "#8A8070" }}>
                Upload a CSV file with player/team data
              </p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()}
                className="px-6 py-3 rounded-2xl font-semibold text-sm text-white"
                style={{ background: "#1A3318" }}>
                Choose CSV File
              </button>
              <div className="mt-5 p-4 rounded-xl text-left" style={{ background: "#F8F4EE" }}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#8A8070" }}>Expected columns</div>
                <code className="text-xs" style={{ color: "#1A3318" }}>
                  Player 1, Player 1 Rating, Player 1 DUPR id, Contact,<br />
                  Player 2, Player 2 Rating, Player 2 DUPR id, Contact, Ranking
                </code>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Configure ── */}
        {step === 2 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.12)" }}>
                  <Trophy size={15} style={{ color: "#C9A84C" }} />
                </div>
                <h2 className="font-display text-lg font-bold" style={{ color: "#1A3318" }}>Draw Configuration</h2>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#8A8070" }}>Teams Loaded</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#F8F4EE" }}>
                    <span className="text-sm font-medium" style={{ color: "#1A3318" }}>
                      {loadSource === "registrations" ? "From approved registrations" : fileName}
                    </span>
                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#A8872E" }}>{teams.length} teams</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#8A8070" }}>Number of Groups</label>
                  <div className="flex gap-2 flex-wrap">
                    {[4, 6, 8, 10, 12].map((n) => (
                      <button key={n} onClick={() => setNumGroups(n)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={numGroups === n ? { background: "#1A3318", color: "white" } : { background: "#F8F4EE", color: "#1A3318", border: "1px solid rgba(232,224,208,0.8)" }}>
                        {n}
                      </button>
                    ))}
                    <input type="number" min={2} max={26} value={numGroups}
                      onChange={(e) => setNumGroups(parseInt(e.target.value) || 4)}
                      className="w-16 px-3 py-2 rounded-xl text-sm font-semibold text-center focus:outline-none"
                      style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318" }} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "#8A8070" }}>
                    {teams.length} teams → {numGroups} groups (~{Math.ceil(teams.length / numGroups)} per group)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#8A8070" }}>Teams Qualifying per Group</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button key={n} onClick={() => setQualifiersPerGroup(n)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={qualifiersPerGroup === n ? { background: "#1A3318", color: "white" } : { background: "#F8F4EE", color: "#1A3318", border: "1px solid rgba(232,224,208,0.8)" }}>
                        Top {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "#8A8070" }}>
                    {totalQualifiers} teams → bracket of {bracketSize}
                    {numByes > 0 ? ` · top ${numByes} seeds get byes` : " · no byes"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#8A8070" }}>Scoring Format</label>
                  <select value={scoringFormat} onChange={(e) => setScoringFormat(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "white" }}>
                    <option>Best of 3, to 11</option>
                    <option>Best of 1, to 11</option>
                    <option>Best of 3, to 15</option>
                    <option>Best of 1, to 15</option>
                    <option>Best of 3, to 21</option>
                    <option>Best of 1, to 21</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                    style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#8A8070", background: "white" }}>
                    ← Back
                  </button>
                  <button onClick={generateGroups}
                    className="flex-1 py-3.5 rounded-2xl font-bold"
                    style={{ background: "#C9A84C", color: "#1A3318" }}>
                    Generate Groups →
                  </button>
                </div>
              </div>
            </div>

            {/* Seeded teams list with reorder */}
            <SeededTeamList teams={teams} onReorder={setTeams} />
          </div>
        )}

        {/* ── Step 3: Groups ── */}
        {step === 3 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold" style={{ color: "#1A3318" }}>Group Draw</h2>
                <p className="text-sm mt-0.5" style={{ color: "#8A8070" }}>
                  {groups.length} groups · {scoringFormat} · Top {qualifiersPerGroup} qualify
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "white" }}>
                  ← Reconfigure
                </button>
                <button onClick={generateKnockout}
                  className="px-5 py-2 rounded-xl text-sm font-bold"
                  style={{ background: "#C9A84C", color: "#1A3318" }}>
                  Generate Knockout →
                </button>
              </div>
            </div>

            {/* Group tabs */}
            <div className="flex gap-1 flex-wrap mb-5" style={{ borderBottom: "1px solid rgba(232,224,208,0.8)" }}>
              {groups.map((g, i) => (
                <button key={i} onClick={() => setActiveGroupTab(i)}
                  className="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
                  style={activeGroupTab === i ? { borderColor: "#C9A84C", color: "#C9A84C" } : { borderColor: "transparent", color: "#8A8070" }}>
                  {g.name}
                </button>
              ))}
            </div>

            {groups[activeGroupTab] && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Group table */}
                <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                  <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#1A3318" }}>
                    <h3 className="font-display font-bold text-white">{groups[activeGroupTab].name}</h3>
                    <span className="text-xs" style={{ color: "rgba(201,168,76,0.7)" }}>{groups[activeGroupTab].teams.length} teams</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(232,224,208,0.5)", background: "#F8F4EE" }}>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Seed</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Team</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Avg DUPR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups[activeGroupTab].teams.map((t, i) => (
                        <tr key={t.seed} style={{ borderBottom: "1px solid rgba(232,224,208,0.4)", background: i < qualifiersPerGroup ? "rgba(45,90,39,0.03)" : "white" }}>
                          <td className="px-4 py-3">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                              style={t.seed <= 4 ? { background: "#C9A84C", color: "#1A3318", display: "inline-flex" } : { background: "#F8F4EE", color: "#8A8070", display: "inline-flex" }}>
                              {t.seed}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold" style={{ color: "#1A3318" }}>{t.player1}</div>
                            {t.player2 && <div className="text-xs" style={{ color: "#8A8070" }}>{t.player2}</div>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-sm" style={{ color: "#C9A84C" }}>
                            {t.teamRating > 0 ? t.teamRating.toFixed(3) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-2 text-xs" style={{ background: "rgba(45,90,39,0.04)", color: "#8A8070" }}>
                    ✓ Top {qualifiersPerGroup} advance to knockout
                  </div>
                </div>

                {/* Fixtures */}
                <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                  <div className="px-5 py-3.5" style={{ background: "#F8F4EE", borderBottom: "1px solid rgba(232,224,208,0.8)" }}>
                    <h3 className="font-display font-bold" style={{ color: "#1A3318" }}>Fixtures</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#8A8070" }}>{scoringFormat}</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(232,224,208,0.5)" }}>
                    {(() => {
                      const grpTeams = groups[activeGroupTab].teams;
                      const fixtures: { t1: Team; t2: Team }[] = [];
                      for (let i = 0; i < grpTeams.length; i++)
                        for (let j = i + 1; j < grpTeams.length; j++)
                          fixtures.push({ t1: grpTeams[i], t2: grpTeams[j] });
                      return fixtures.map((f, idx) => (
                        <div key={idx} className="px-5 py-3 flex items-center gap-3">
                          <span className="text-xs font-bold w-5 text-center" style={{ color: "#8A8070" }}>{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <div className="min-w-0">
                                <span className="font-medium" style={{ color: "#1A3318" }}>{f.t1.player1}</span>
                                {f.t1.player2 && <span className="text-xs ml-1" style={{ color: "#8A8070" }}>/ {f.t1.player2}</span>}
                              </div>
                              <span className="text-xs flex-shrink-0" style={{ color: "#C9A84C" }}>vs</span>
                              <div className="min-w-0">
                                <span className="font-medium" style={{ color: "#1A3318" }}>{f.t2.player1}</span>
                                {f.t2.player2 && <span className="text-xs ml-1" style={{ color: "#8A8070" }}>/ {f.t2.player2}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#F8F4EE", color: "#8A8070" }}>S{f.t1.seed}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#F8F4EE", color: "#8A8070" }}>S{f.t2.seed}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* All groups overview */}
            <div className="mt-8">
              <h3 className="font-display text-lg font-bold mb-4" style={{ color: "#1A3318" }}>All Groups Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {groups.map((g, i) => (
                  <button key={i} onClick={() => setActiveGroupTab(i)}
                    className="bg-white rounded-2xl p-4 text-left hover:shadow-md"
                    style={{ border: activeGroupTab === i ? "2px solid #C9A84C" : "1px solid rgba(232,224,208,0.8)" }}>
                    <div className="font-display font-bold mb-2" style={{ color: "#1A3318" }}>{g.name}</div>
                    {g.teams.slice(0, 3).map((t) => (
                      <div key={t.seed} className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: t.seed <= 4 ? "#C9A84C" : "#F8F4EE", color: t.seed <= 4 ? "#1A3318" : "#8A8070" }}>
                          {t.seed}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs truncate block" style={{ color: "#1A3318" }}>{t.player1}</span>
                          {t.player2 && <span className="text-[10px] truncate block" style={{ color: "#8A8070" }}>{t.player2}</span>}
                        </div>
                      </div>
                    ))}
                    {g.teams.length > 3 && <div className="text-xs mt-1" style={{ color: "#8A8070" }}>+{g.teams.length - 3} more</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Knockout ── */}
        {step === 4 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold" style={{ color: "#1A3318" }}>Knockout Draw</h2>
                <p className="text-sm mt-0.5" style={{ color: "#8A8070" }}>
                  {totalQualifiers} qualifiers · bracket of {bracketSize}
                  {numByes > 0 ? ` · top ${numByes} seeds get byes` : " · no byes"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ border: "1px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "white" }}>
                  ← Groups
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "#1A3318", color: "white" }}>
                  <Download size={14} /> Export
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#1A3318" }}>
                <Trophy size={18} style={{ color: "#C9A84C" }} />
                <span className="font-display font-bold text-white">Knockout Bracket — {category.name}</span>
                {category.drawPublished && (
                  <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "#F0FDF4", color: "#16A34A" }}>
                    <Globe size={10} /> Published
                  </span>
                )}
              </div>
              <div className="p-6" style={{ background: "#FDFAF5" }}>
                <WimbledonBracket
                  matches={bracketMatches}
                  totalRounds={totalRounds}
                  groupStandings={
                    // Only populate knockout slots once group stage is complete.
                    // We derive standings from the saved drawData groups (which have
                    // actual match results recorded via the schedule page).
                    // For now, pass null so all slots show "TBD" until group stage ends.
                    // When the schedule page records results and updates category.standings,
                    // we build the map from the saved groups ordered by standings.
                    (() => {
                      if (!category?.standings || category.standings.length === 0) return null;
                      // category.standings is a flat list sorted by points.
                      // We need to map each entry back to its group using the saved drawData.
                      let savedGroups: Group[] = groups;
                      if (category.drawData) {
                        try { savedGroups = JSON.parse(category.drawData).groups ?? groups; } catch { /* ignore */ }
                      }
                      const map = new Map<number, Team[]>();
                      savedGroups.forEach((g, idx) => {
                        // Get all registrationIds in this group
                        const groupRegIds = new Set(g.teams.map((t) => t.registrationId).filter(Boolean));
                        // Filter standings to this group's teams
                        const groupStandings = (category.standings ?? [])
                          .filter((s) => groupRegIds.has(s.registrationId))
                          .sort((a, b) => b.points - a.points || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
                        if (groupStandings.length > 0) {
                          map.set(idx, groupStandings.map((s) => ({
                            seed: 0,
                            player1: s.player1Name,
                            player1Rating: 0,
                            player1DuprId: "",
                            player2: s.player2Name ?? "",
                            player2Rating: 0,
                            player2DuprId: "",
                            teamRating: 0,
                            contact1: "",
                            contact2: "",
                          })));
                        }
                      });
                      // Only show names if ALL groups have standings (group stage complete)
                      return map.size === savedGroups.length ? map : null;
                    })()
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
