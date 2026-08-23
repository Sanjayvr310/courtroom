// ─────────────────────────────────────────────────────────────────────────────
// Tournament Store — localStorage-backed
// ─────────────────────────────────────────────────────────────────────────────

export type RegistrationStatus = "pending" | "approved" | "rejected" | "waitlisted";

export interface Registration {
  id: string;
  categoryId: string;
  // Player 1
  player1Name: string;
  player1Email: string;
  player1Phone: string;
  player1DuprId?: string;
  player1Rating?: number;
  // Player 2 (for doubles)
  player2Name?: string;
  player2Email?: string;
  player2Phone?: string;
  player2DuprId?: string;
  player2Rating?: number;
  // Meta
  status: RegistrationStatus;
  notes?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface StandingsEntry {
  registrationId: string;
  player1Name: string;
  player2Name?: string;
  played: number;
  won: number;
  lost: number;
  gamesWon: number;
  gamesLost: number;
  pointsWon: number;
  pointsLost: number;
  points: number; // league points
}

export interface TournamentCategory {
  id: string;
  name: string;
  type?: "singles" | "doubles"; // explicit type field
  format: string; // e.g. "Pool + Knockout"
  scoringFormat: string;
  numGroups: number;
  qualifiersPerGroup: number;
  maxTeams?: number;
  entryFee?: string;
  registrationOpen: boolean;
  drawPublished: boolean;
  drawData?: string; // JSON stringified draw data
  standings?: StandingsEntry[];
  createdAt: string;
}

export interface UmpireEntry {
  id: string;
  name: string;
  phone?: string;
  badge?: string;
  photo?: string; // base64
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  bannerImage: string; // base64 or URL
  logoImage?: string;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  prize: string;
  registrationDeadline?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "draft" | "registration_open" | "registration_closed" | "ongoing" | "completed";
  categories: TournamentCategory[];
  registrations: Registration[];
  umpires?: UmpireEntry[]; // tournament-level umpire roster
  createdAt: string;
}

const STORAGE_KEY = "courtroom_tournaments_v2";

export function getTournaments(): Tournament[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTournaments(tournaments: Tournament[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
}

export function getTournament(id: string): Tournament | null {
  return getTournaments().find((t) => t.id === id) ?? null;
}

export function saveTournament(tournament: Tournament): void {
  const all = getTournaments();
  const idx = all.findIndex((t) => t.id === tournament.id);
  if (idx >= 0) {
    all[idx] = tournament;
  } else {
    all.push(tournament);
  }
  saveTournaments(all);
}

export function deleteTournament(id: string): void {
  saveTournaments(getTournaments().filter((t) => t.id !== id));
}

// ── Standings: recompute from all completed matches for a category ─────────────
// Call this after every match completes. It reads all matches from match-store
// (via localStorage) and rebuilds the standings for the category.
// Standings are keyed by team name (team1Name / team2Name from match state).
export function recomputeStandings(tournamentId: string, categoryId: string): void {
  if (typeof window === "undefined") return;
  const t = getTournament(tournamentId);
  if (!t) return;

  // Read all matches for this category from match-store localStorage
  const MATCHES_KEY = "courtroom_matches_v1";
  let allMatches: Record<string, { state: {
    tournamentId: string; categoryId: string; status: string;
    team1Name: string; team2Name: string;
    team1GamesWon: number; team2GamesWon: number;
    games: { team1: number; team2: number; winner?: string }[];
    winnerId?: string;
  }; events: unknown[] }> = {};
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    allMatches = raw ? JSON.parse(raw) : {};
  } catch { return; }

  const catMatches = Object.values(allMatches).filter(
    (m) => m.state.tournamentId === tournamentId &&
           m.state.categoryId === categoryId &&
           (m.state.status === "MATCH_COMPLETED" || m.state.status === "FORFEITED")
  );

  // Build standings map: teamName → StandingsEntry
  const map = new Map<string, StandingsEntry>();

  function getOrCreate(teamName: string): StandingsEntry {
    if (!map.has(teamName)) {
      map.set(teamName, {
        registrationId: teamName, // use team name as key (no reg link needed for display)
        player1Name: teamName.split(" / ")[0] ?? teamName,
        player2Name: teamName.includes(" / ") ? teamName.split(" / ")[1] : undefined,
        played: 0, won: 0, lost: 0,
        gamesWon: 0, gamesLost: 0,
        pointsWon: 0, pointsLost: 0,
        points: 0,
      });
    }
    return map.get(teamName)!;
  }

  for (const m of catMatches) {
    const { team1Name, team2Name, team1GamesWon, team2GamesWon, games, winnerId } = m.state;
    const t1 = getOrCreate(team1Name);
    const t2 = getOrCreate(team2Name);

    t1.played += 1;
    t2.played += 1;

    if (winnerId === "team1") {
      t1.won += 1; t1.points += 2;
      t2.lost += 1;
    } else if (winnerId === "team2") {
      t2.won += 1; t2.points += 2;
      t1.lost += 1;
    }

    t1.gamesWon += team1GamesWon;
    t1.gamesLost += team2GamesWon;
    t2.gamesWon += team2GamesWon;
    t2.gamesLost += team1GamesWon;

    for (const g of games) {
      if (g.winner) {
        t1.pointsWon += g.team1;
        t1.pointsLost += g.team2;
        t2.pointsWon += g.team2;
        t2.pointsLost += g.team1;
      }
    }
  }

  const standings = Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.gamesWon - a.gamesLost;
    const bDiff = b.gamesWon - b.gamesLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    return (b.pointsWon - b.pointsLost) - (a.pointsWon - a.pointsLost);
  });

  const updatedT: Tournament = {
    ...t,
    categories: t.categories.map((c) =>
      c.id === categoryId ? { ...c, standings } : c
    ),
  };
  saveTournament(updatedT);
}

// ── Clear all data (for testing / reset) ─────────────────────────────────────
export function clearAllData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("courtroom_tournaments_v2");
  localStorage.removeItem("courtroom_matches_v1");
}

export function addRegistration(tournamentId: string, reg: Registration): void {
  const t = getTournament(tournamentId);
  if (!t) return;
  t.registrations = [...(t.registrations ?? []), reg];
  saveTournament(t);
}

export function updateRegistrationStatus(
  tournamentId: string,
  registrationId: string,
  status: RegistrationStatus
): void {
  const t = getTournament(tournamentId);
  if (!t) return;
  t.registrations = (t.registrations ?? []).map((r) =>
    r.id === registrationId ? { ...r, status, reviewedAt: new Date().toISOString() } : r
  );
  saveTournament(t);
}

export function createId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatPrize(prize: string): string {
  if (!prize) return "";
  // If already has ₹ or INR prefix, return as-is
  if (prize.startsWith("₹") || prize.toLowerCase().startsWith("inr")) return prize;
  return `₹${prize}`;
}

export function getTournamentStatusLabel(status: Tournament["status"]): string {
  switch (status) {
    case "draft": return "Draft";
    case "registration_open": return "Registration Open";
    case "registration_closed": return "Registration Closed";
    case "ongoing": return "Ongoing";
    case "completed": return "Completed";
    default: return status;
  }
}

export function getTournamentStatusColor(status: Tournament["status"]): { bg: string; text: string } {
  switch (status) {
    case "draft": return { bg: "#F3F4F6", text: "#6B7280" };
    case "registration_open": return { bg: "#F0FDF4", text: "#16A34A" };
    case "registration_closed": return { bg: "#FEF3C7", text: "#D97706" };
    case "ongoing": return { bg: "#FEF2F2", text: "#DC2626" };
    case "completed": return { bg: "#F0EDE8", text: "#8A8070" };
    default: return { bg: "#F3F4F6", text: "#6B7280" };
  }
}
