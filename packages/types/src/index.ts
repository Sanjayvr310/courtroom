// ============================================================
// THE COURT ROOM — Shared TypeScript Types
// ============================================================

// ─── Enums ───────────────────────────────────────────────────

export type TournamentStatus = "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "LIVE" | "COMPLETED" | "CANCELLED";
export type TournamentFormat = "ROUND_ROBIN" | "POOL_KNOCKOUT" | "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION";
export type MatchStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" | "WALKOVER";
export type CourtStatus = "AVAILABLE" | "LIVE" | "BREAK" | "MAINTENANCE";
export type PlayerStatus = "ACTIVE" | "ELIMINATED" | "WITHDRAWN";
export type CategoryType = "MENS_SINGLES" | "WOMENS_SINGLES" | "MENS_DOUBLES" | "WOMENS_DOUBLES" | "MIXED_DOUBLES";
export type UserRole = "PLAYER" | "UMPIRE" | "ADMIN" | "SPECTATOR";
export type NotificationType = "MATCH_START" | "MATCH_RESULT" | "TOURNAMENT_UPDATE" | "GENERAL";

// ─── Core Entities ───────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  duprRating?: number;
  duprId?: string;
  city?: string;
  country?: string;
  wins: number;
  losses: number;
  winRate: number;
  totalMatches: number;
  rank?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  city: string;
  venue?: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  format: TournamentFormat;
  maxPlayers?: number;
  registrationDeadline?: string;
  entryFee?: number;
  prizePool?: number;
  categories: Category[];
  courts: Court[];
  _count?: {
    players: number;
    matches: number;
    teams: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  tournamentId: string;
  type: CategoryType;
  name: string;
  maxTeams?: number;
  format: TournamentFormat;
  createdAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  categoryId: string;
  name?: string;
  player1: Player;
  player1Id: string;
  player2?: Player;
  player2Id?: string;
  seed?: number;
  status: PlayerStatus;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  points: number;
}

export interface Court {
  id: string;
  tournamentId: string;
  name: string;
  number: number;
  status: CourtStatus;
  streamUrl?: string;
  currentMatch?: Match;
  nextMatch?: Match;
}

export interface Match {
  id: string;
  tournamentId: string;
  categoryId: string;
  courtId?: string;
  court?: Court;
  team1: Team;
  team1Id: string;
  team2: Team;
  team2Id: string;
  status: MatchStatus;
  round: string;
  roundNumber: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  winnerId?: string;
  umpireId?: string;
  umpire?: Umpire;
  games: Game[];
  duration?: number; // seconds
  matchNumber: number;
}

export interface Game {
  id: string;
  matchId: string;
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  startedAt?: string;
  completedAt?: string;
  points?: Point[];
}

export interface Point {
  id: string;
  gameId: string;
  scoringTeamId: string;
  team1Score: number;
  team2Score: number;
  timestamp: string;
}

export interface Umpire {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Standing {
  rank: number;
  team: Team;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  points: number;
}

// ─── Live Match State (WebSocket) ────────────────────────────

export interface LiveMatchState {
  matchId: string;
  status: MatchStatus;
  team1: {
    id: string;
    name: string;
    score: number; // current game score
    gamesWon: number;
  };
  team2: {
    id: string;
    name: string;
    score: number;
    gamesWon: number;
  };
  currentGame: number;
  totalGames: number;
  elapsedSeconds: number;
  courtName: string;
  round: string;
  categoryName: string;
}

// ─── WebSocket Events ─────────────────────────────────────────

export type WsEvent =
  | { type: "SCORE_UPDATE"; payload: LiveMatchState }
  | { type: "MATCH_STARTED"; payload: { matchId: string } }
  | { type: "MATCH_COMPLETED"; payload: { matchId: string; winnerId: string } }
  | { type: "GAME_COMPLETED"; payload: { matchId: string; gameNumber: number; winnerId: string } }
  | { type: "TIMEOUT_CALLED"; payload: { matchId: string; teamId: string } }
  | { type: "COURT_STATUS_CHANGED"; payload: { courtId: string; status: CourtStatus } };

// ─── API Response Types ───────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ─── Tournament Simulator ─────────────────────────────────────

export interface SimulatorConfig {
  players: number;
  courts: number;
  matchDurationMinutes: number;
  restMinutes: number;
  startTime: string; // HH:MM
  format: TournamentFormat;
}

export interface SimulatorResult {
  totalMatches: number;
  estimatedFinish: string;
  courtUtilization: number;
  bottlenecks: SimulatorBottleneck[];
  schedule: SimulatorSlot[];
}

export interface SimulatorBottleneck {
  round: string;
  startTime: string;
  endTime: string;
  suggestion: string;
}

export interface SimulatorSlot {
  courtId: string;
  matchId: string;
  startTime: string;
  endTime: string;
  round: string;
}
