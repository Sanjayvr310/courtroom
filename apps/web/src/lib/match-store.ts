// ─────────────────────────────────────────────────────────────────────────────
// Match Store — localStorage-backed, event-sourced match state
// Supports configurable pickleball rules engine
// ─────────────────────────────────────────────────────────────────────────────

// ── Rules Configuration ───────────────────────────────────────────────────────

export interface RulesConfig {
  format: "singles" | "doubles";
  bestOf: 1 | 3 | 5;
  pointsToWin: 11 | 15 | 21;
  winBy: 2;
  maxTimeoutsPerTeam: number; // typically 1 per game
  timeoutDurationSeconds: number; // typically 60
  gameBreakSeconds: number; // break between games
  sideChangeOnFinalGame: boolean; // switch sides at half in final game
  sideChangePointThreshold: number; // e.g. 6 for 11-pt, 8 for 15-pt, 11 for 21-pt
}

export function parseRulesFromFormat(scoringFormat: string, catType?: string): RulesConfig {
  // Parse "Best of 3, to 11" style strings
  let bestOf: 1 | 3 | 5 = 3;
  let pointsToWin: 11 | 15 | 21 = 11;

  const boMatch = scoringFormat.match(/best of (\d)/i);
  if (boMatch) bestOf = parseInt(boMatch[1]) as 1 | 3 | 5;

  const ptMatch = scoringFormat.match(/to (\d+)/i);
  if (ptMatch) {
    const pts = parseInt(ptMatch[1]);
    if (pts === 15) pointsToWin = 15;
    else if (pts === 21) pointsToWin = 21;
    else pointsToWin = 11;
  }

  const sideChangeThreshold = pointsToWin === 11 ? 6 : pointsToWin === 15 ? 8 : 11;

  return {
    format: catType === "singles" ? "singles" : "doubles",
    bestOf,
    pointsToWin,
    winBy: 2,
    maxTimeoutsPerTeam: 1,
    timeoutDurationSeconds: 60,
    gameBreakSeconds: 120,
    sideChangeOnFinalGame: true,
    sideChangePointThreshold: sideChangeThreshold,
  };
}

// ── Pickleball Serve Rotation ─────────────────────────────────────────────────
//
// Official pickleball doubles serve rotation:
// - Game starts at 0-0-2 (first server of the game gets only ONE serve, then side-out)
// - After that, each side-out gives BOTH players on the team a serve (server 1 then server 2)
// - Callout format: server_score - receiver_score - server_number (1 or 2)
//
// We track:
//   servingTeam: "team1" | "team2"
//   servingPlayerIndex: 0 | 1  (which player on the team is currently serving)
//   isFirstServerOfGame: boolean (true only at the very start of each game)

// ── Match State Machine ───────────────────────────────────────────────────────

export type MatchStatus =
  | "SCHEDULED"
  | "READY"
  | "STARTED"
  | "GAME_IN_PROGRESS"
  | "GAME_BREAK"
  | "MATCH_PAUSED"
  | "MATCH_DELAYED"
  | "MATCH_COMPLETED"
  | "MATCH_DISPUTED"
  | "FORFEITED"
  | "CANCELLED";

// ── Score Events ──────────────────────────────────────────────────────────────

export type ScoreEventType =
  | "MATCH_STARTED"
  | "POINT_SCORED"
  | "POINT_UNDONE"
  | "GAME_STARTED"
  | "GAME_COMPLETED"
  | "TIMEOUT_STARTED"
  | "TIMEOUT_COMPLETED"
  | "MATCH_PAUSED"
  | "MATCH_RESUMED"
  | "MATCH_COMPLETED"
  | "MATCH_FORFEITED"
  | "MATCH_DISPUTED"
  | "MATCH_CORRECTED"
  | "SIDE_CHANGED";

export interface ScoreEvent {
  eventId: string;
  matchId: string;
  tournamentId: string;
  categoryId: string;
  actorId: string; // umpire name / "system"
  actorRole: "UMPIRE" | "ADMIN" | "SYSTEM";
  timestamp: string;
  eventType: ScoreEventType;
  sequenceNumber: number;
  previousState: Partial<LiveMatchState>;
  newState: Partial<LiveMatchState>;
  metadata?: Record<string, unknown>;
  reason?: string; // for corrections/disputes
  isReversal?: boolean; // true for undo events
}

// ── Game Score ────────────────────────────────────────────────────────────────

export interface GameScore {
  gameNumber: number; // 1-indexed
  team1: number;
  team2: number;
  winner?: "team1" | "team2";
  startedAt?: string;
  completedAt?: string;
}

// ── Timeout State ─────────────────────────────────────────────────────────────

export interface TimeoutState {
  team1Used: number;
  team2Used: number;
  activeTeam?: "team1" | "team2";
  startedAt?: string;
}

// ── Live Match State ──────────────────────────────────────────────────────────

export interface LiveMatchState {
  // Identity
  matchId: string;
  tournamentId: string;
  categoryId: string;
  groupName?: string; // e.g. "Group A"
  round?: string; // e.g. "Pool", "QF", "SF", "F"
  court?: string;

  // Teams
  team1Name: string;
  team2Name: string;
  team1Players: string[]; // player names
  team2Players: string[];

  // Rules
  rules: RulesConfig;

  // Status
  status: MatchStatus;

  // Scores
  games: GameScore[];
  currentGame: number; // 0-indexed
  team1GamesWon: number;
  team2GamesWon: number;

  // Serving (pickleball doubles serve rotation)
  servingTeam?: "team1" | "team2";
  servingPlayer?: string; // for doubles: which player is serving (player name)
  servingPlayerIndex?: 0 | 1; // 0 = first player, 1 = second player on the team
  serverNumber?: 1 | 2; // 1 or 2 for callout (2 at game start = 0-0-2)
  isFirstServerOfGame?: boolean; // true only at game start (gets only 1 serve)
  serverScore?: number; // server's current score (for call-out)

  // Timeouts
  timeouts: TimeoutState;

  // Match timing
  startedAt?: string;
  completedAt?: string;
  elapsedSeconds: number;
  pausedAt?: string;
  pausedElapsed?: number;

  // Result
  winnerId?: "team1" | "team2";
  resultNotes?: string;

  // Umpire
  umpireName?: string;

  // Audit
  lastUpdatedAt: string;
  eventCount: number;
}

// ── Stored Match ──────────────────────────────────────────────────────────────

export interface StoredMatch {
  state: LiveMatchState;
  events: ScoreEvent[];
}

// ── Storage Keys ──────────────────────────────────────────────────────────────

const MATCHES_KEY = "courtroom_matches_v1";

function getAllMatches(): Record<string, StoredMatch> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllMatches(matches: Record<string, StoredMatch>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

export function getMatch(matchId: string): StoredMatch | null {
  return getAllMatches()[matchId] ?? null;
}

export function saveMatch(match: StoredMatch): void {
  const all = getAllMatches();
  all[match.state.matchId] = match;
  saveAllMatches(all);
}

export function getAllMatchIds(): string[] {
  return Object.keys(getAllMatches());
}

export function getMatchesForTournament(tournamentId: string): StoredMatch[] {
  return Object.values(getAllMatches()).filter(
    (m) => m.state.tournamentId === tournamentId
  );
}

export function getMatchesForCategory(tournamentId: string, categoryId: string): StoredMatch[] {
  return Object.values(getAllMatches()).filter(
    (m) => m.state.tournamentId === tournamentId && m.state.categoryId === categoryId
  );
}

// ── Match Factory ─────────────────────────────────────────────────────────────

export function createMatchId(): string {
  return "m_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createEventId(): string {
  return "e_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createNewMatch(params: {
  matchId?: string;
  tournamentId: string;
  categoryId: string;
  team1Name: string;
  team2Name: string;
  team1Players?: string[];
  team2Players?: string[];
  rules: RulesConfig;
  groupName?: string;
  round?: string;
  court?: string;
  umpireName?: string;
}): StoredMatch {
  const matchId = params.matchId ?? createMatchId();
  const state: LiveMatchState = {
    matchId,
    tournamentId: params.tournamentId,
    categoryId: params.categoryId,
    groupName: params.groupName,
    round: params.round,
    court: params.court,
    team1Name: params.team1Name,
    team2Name: params.team2Name,
    team1Players: params.team1Players ?? [params.team1Name],
    team2Players: params.team2Players ?? [params.team2Name],
    rules: params.rules,
    status: "READY",
    games: [{ gameNumber: 1, team1: 0, team2: 0 }],
    currentGame: 0,
    team1GamesWon: 0,
    team2GamesWon: 0,
    timeouts: { team1Used: 0, team2Used: 0 },
    elapsedSeconds: 0,
    umpireName: params.umpireName,
    lastUpdatedAt: new Date().toISOString(),
    eventCount: 0,
  };
  return { state, events: [] };
}

// ── Rules Engine ──────────────────────────────────────────────────────────────

export function checkGameWinner(
  score: GameScore,
  rules: RulesConfig
): "team1" | "team2" | null {
  const { team1, team2 } = score;
  if (team1 >= rules.pointsToWin && team1 - team2 >= rules.winBy) return "team1";
  if (team2 >= rules.pointsToWin && team2 - team1 >= rules.winBy) return "team2";
  return null;
}

export function gamesNeededToWin(rules: RulesConfig): number {
  return Math.ceil(rules.bestOf / 2);
}

export function isFinalGame(state: LiveMatchState): boolean {
  const needed = gamesNeededToWin(state.rules);
  return state.team1GamesWon === needed - 1 && state.team2GamesWon === needed - 1;
}

export function shouldChangeSides(state: LiveMatchState): boolean {
  if (!state.rules.sideChangeOnFinalGame) return false;
  if (!isFinalGame(state)) return false;
  const current = state.games[state.currentGame];
  const total = current.team1 + current.team2;
  return total === state.rules.sideChangePointThreshold;
}

// ── Score Action ──────────────────────────────────────────────────────────────

export function applyScorePoint(
  stored: StoredMatch,
  team: "team1" | "team2",
  umpireName: string
): StoredMatch {
  const { state, events } = stored;
  if (state.status !== "GAME_IN_PROGRESS" && state.status !== "STARTED") return stored;

  const prevState: Partial<LiveMatchState> = {
    games: JSON.parse(JSON.stringify(state.games)),
    currentGame: state.currentGame,
    team1GamesWon: state.team1GamesWon,
    team2GamesWon: state.team2GamesWon,
    status: state.status,
    winnerId: state.winnerId,
    servingTeam: state.servingTeam,
  };

  const games = JSON.parse(JSON.stringify(state.games)) as GameScore[];
  const current = games[state.currentGame];
  current[team] += 1;

  // Determine serving team after point (side-out scoring: server wins point = keep serve; receiver wins = side-out)
  let newServingTeam = state.servingTeam;
  if (state.servingTeam && state.servingTeam !== team) {
    // Side-out: receiving team won the point, they now serve
    newServingTeam = team;
  }

  const gameWinner = checkGameWinner(current, state.rules);
  const now = new Date().toISOString();

  let newStatus: MatchStatus = "GAME_IN_PROGRESS";
  let t1GamesWon = state.team1GamesWon;
  let t2GamesWon = state.team2GamesWon;
  let winnerId = state.winnerId;
  let newCurrentGame = state.currentGame;
  let newGames = games;

  if (gameWinner) {
    current.winner = gameWinner;
    current.completedAt = now;
    t1GamesWon = state.team1GamesWon + (gameWinner === "team1" ? 1 : 0);
    t2GamesWon = state.team2GamesWon + (gameWinner === "team2" ? 1 : 0);

    const needed = gamesNeededToWin(state.rules);
    if (t1GamesWon >= needed || t2GamesWon >= needed) {
      // Match over
      newStatus = "MATCH_COMPLETED";
      winnerId = gameWinner;
    } else {
      // Start next game
      newStatus = "GAME_BREAK";
      newCurrentGame = state.currentGame + 1;
      newGames = [...games, { gameNumber: newCurrentGame + 1, team1: 0, team2: 0, startedAt: undefined }];
    }
  }

  const newState: LiveMatchState = {
    ...state,
    games: newGames,
    currentGame: newCurrentGame,
    team1GamesWon: t1GamesWon,
    team2GamesWon: t2GamesWon,
    status: newStatus,
    winnerId,
    servingTeam: newServingTeam,
    serverScore: newServingTeam === "team1" ? newGames[newCurrentGame]?.team1 : newGames[newCurrentGame]?.team2,
    completedAt: newStatus === "MATCH_COMPLETED" ? now : undefined,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "POINT_SCORED",
    sequenceNumber: state.eventCount + 1,
    previousState: prevState,
    newState: {
      games: newState.games,
      currentGame: newState.currentGame,
      team1GamesWon: newState.team1GamesWon,
      team2GamesWon: newState.team2GamesWon,
      status: newState.status,
      winnerId: newState.winnerId,
      servingTeam: newState.servingTeam,
    },
    metadata: { team, gameNumber: state.currentGame + 1 },
  };

  return { state: newState, events: [...events, event] };
}

export function applyUndoLastPoint(
  stored: StoredMatch,
  umpireName: string
): StoredMatch {
  const { state, events } = stored;

  // Find last POINT_SCORED event that is not already reversed
  const reversedIds = new Set(
    events.filter((e) => e.isReversal && e.metadata?.reversedEventId).map((e) => e.metadata!.reversedEventId as string)
  );
  const lastPoint = [...events].reverse().find(
    (e) => e.eventType === "POINT_SCORED" && !reversedIds.has(e.eventId)
  );

  if (!lastPoint) return stored;

  const now = new Date().toISOString();
  const prevState = lastPoint.previousState as Partial<LiveMatchState>;

  // Restore state from before that point
  const restoredState: LiveMatchState = {
    ...state,
    games: prevState.games ?? state.games,
    currentGame: prevState.currentGame ?? state.currentGame,
    team1GamesWon: prevState.team1GamesWon ?? state.team1GamesWon,
    team2GamesWon: prevState.team2GamesWon ?? state.team2GamesWon,
    status: prevState.status ?? state.status,
    winnerId: prevState.winnerId,
    servingTeam: prevState.servingTeam,
    completedAt: prevState.status === "MATCH_COMPLETED" ? state.completedAt : undefined,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const undoEvent: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "POINT_UNDONE",
    sequenceNumber: state.eventCount + 1,
    previousState: {
      games: state.games,
      currentGame: state.currentGame,
      team1GamesWon: state.team1GamesWon,
      team2GamesWon: state.team2GamesWon,
      status: state.status,
    },
    newState: {
      games: restoredState.games,
      currentGame: restoredState.currentGame,
      team1GamesWon: restoredState.team1GamesWon,
      team2GamesWon: restoredState.team2GamesWon,
      status: restoredState.status,
    },
    isReversal: true,
    metadata: { reversedEventId: lastPoint.eventId },
  };

  return { state: restoredState, events: [...events, undoEvent] };
}

export function applyStartMatch(stored: StoredMatch, umpireName: string): StoredMatch {
  const { state, events } = stored;
  if (state.status !== "READY" && state.status !== "SCHEDULED") return stored;

  const now = new Date().toISOString();
  const games = [{ gameNumber: 1, team1: 0, team2: 0, startedAt: now }];

  const newState: LiveMatchState = {
    ...state,
    status: "GAME_IN_PROGRESS",
    startedAt: now,
    games,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "MATCH_STARTED",
    sequenceNumber: state.eventCount + 1,
    previousState: { status: state.status },
    newState: { status: "GAME_IN_PROGRESS" },
  };

  return { state: newState, events: [...events, event] };
}

export function applyStartNextGame(stored: StoredMatch, umpireName: string): StoredMatch {
  const { state, events } = stored;
  if (state.status !== "GAME_BREAK") return stored;

  const now = new Date().toISOString();
  const games = JSON.parse(JSON.stringify(state.games)) as GameScore[];
  games[state.currentGame].startedAt = now;

  const newState: LiveMatchState = {
    ...state,
    status: "GAME_IN_PROGRESS",
    games,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "GAME_STARTED",
    sequenceNumber: state.eventCount + 1,
    previousState: { status: state.status, currentGame: state.currentGame },
    newState: { status: "GAME_IN_PROGRESS", currentGame: state.currentGame },
    metadata: { gameNumber: state.currentGame + 1 },
  };

  return { state: newState, events: [...events, event] };
}

export function applyTimeout(
  stored: StoredMatch,
  team: "team1" | "team2",
  umpireName: string
): StoredMatch {
  const { state, events } = stored;
  if (state.status !== "GAME_IN_PROGRESS") return stored;

  const used = team === "team1" ? state.timeouts.team1Used : state.timeouts.team2Used;
  if (used >= state.rules.maxTimeoutsPerTeam) return stored;

  const now = new Date().toISOString();
  const newTimeouts: TimeoutState = {
    ...state.timeouts,
    team1Used: team === "team1" ? state.timeouts.team1Used + 1 : state.timeouts.team1Used,
    team2Used: team === "team2" ? state.timeouts.team2Used + 1 : state.timeouts.team2Used,
    activeTeam: team,
    startedAt: now,
  };

  const newState: LiveMatchState = {
    ...state,
    timeouts: newTimeouts,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "TIMEOUT_STARTED",
    sequenceNumber: state.eventCount + 1,
    previousState: { timeouts: state.timeouts },
    newState: { timeouts: newTimeouts },
    metadata: { team },
  };

  return { state: newState, events: [...events, event] };
}

export function applyPauseMatch(stored: StoredMatch, umpireName: string): StoredMatch {
  const { state, events } = stored;
  if (state.status !== "GAME_IN_PROGRESS") return stored;

  const now = new Date().toISOString();
  const newState: LiveMatchState = {
    ...state,
    status: "MATCH_PAUSED",
    pausedAt: now,
    pausedElapsed: state.elapsedSeconds,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "MATCH_PAUSED",
    sequenceNumber: state.eventCount + 1,
    previousState: { status: state.status },
    newState: { status: "MATCH_PAUSED" },
  };

  return { state: newState, events: [...events, event] };
}

export function applyResumeMatch(stored: StoredMatch, umpireName: string): StoredMatch {
  const { state, events } = stored;
  if (state.status !== "MATCH_PAUSED") return stored;

  const now = new Date().toISOString();
  const newState: LiveMatchState = {
    ...state,
    status: "GAME_IN_PROGRESS",
    pausedAt: undefined,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "MATCH_RESUMED",
    sequenceNumber: state.eventCount + 1,
    previousState: { status: state.status },
    newState: { status: "GAME_IN_PROGRESS" },
  };

  return { state: newState, events: [...events, event] };
}

export function applyForfeit(
  stored: StoredMatch,
  forfeitingTeam: "team1" | "team2",
  umpireName: string,
  reason?: string
): StoredMatch {
  const { state, events } = stored;
  const now = new Date().toISOString();
  const winner: "team1" | "team2" = forfeitingTeam === "team1" ? "team2" : "team1";

  const newState: LiveMatchState = {
    ...state,
    status: "FORFEITED",
    winnerId: winner,
    completedAt: now,
    resultNotes: reason ?? `${forfeitingTeam === "team1" ? state.team1Name : state.team2Name} forfeited`,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "MATCH_FORFEITED",
    sequenceNumber: state.eventCount + 1,
    previousState: { status: state.status },
    newState: { status: "FORFEITED", winnerId: winner },
    reason,
    metadata: { forfeitingTeam },
  };

  return { state: newState, events: [...events, event] };
}

export function applyDispute(stored: StoredMatch, umpireName: string, reason: string): StoredMatch {
  const { state, events } = stored;
  const now = new Date().toISOString();

  const newState: LiveMatchState = {
    ...state,
    status: "MATCH_DISPUTED",
    resultNotes: reason,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "MATCH_DISPUTED",
    sequenceNumber: state.eventCount + 1,
    previousState: { status: state.status },
    newState: { status: "MATCH_DISPUTED" },
    reason,
  };

  return { state: newState, events: [...events, event] };
}

export function applySetServingTeam(
  stored: StoredMatch,
  team: "team1" | "team2",
  playerIndex: 0 | 1,
  umpireName: string,
  isFirstServerOfGame?: boolean
): StoredMatch {
  const { state, events } = stored;
  const now = new Date().toISOString();

  const players = team === "team1" ? state.team1Players : state.team2Players;
  const servingPlayer = players[playerIndex] ?? players[0];
  // serverNumber: at game start the first server is "server 2" (0-0-2 rule)
  // isFirstServerOfGame defaults to true when called at match start
  // isFirstServerOfGame=true means this is the very first server of the game (0-0-2 rule)
  // When true, serverNumber MUST be 2 regardless of playerIndex
  const firstServer = isFirstServerOfGame === true;
  const serverNumber: 1 | 2 = firstServer ? 2 : (playerIndex === 0 ? 1 : 2);

  const newState: LiveMatchState = {
    ...state,
    servingTeam: team,
    servingPlayer,
    servingPlayerIndex: playerIndex,
    serverNumber,
    isFirstServerOfGame: firstServer,
    serverScore: team === "team1" ? state.games[state.currentGame]?.team1 : state.games[state.currentGame]?.team2,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "MATCH_CORRECTED",
    sequenceNumber: state.eventCount + 1,
    previousState: { servingTeam: state.servingTeam, servingPlayer: state.servingPlayer },
    newState: { servingTeam: team, servingPlayer },
    metadata: { action: "SET_SERVING_TEAM", team, playerIndex, serverNumber },
  };

  return { state: newState, events: [...events, event] };
}

// ── Pickleball Side-Out Scoring Engine ───────────────────────────────────────
//
// OFFICIAL PICKLEBALL RULES (doubles):
// - ONLY the serving team can score points.
// - If the serving team wins the rally → +1 point, same server keeps serving.
// - If the receiving team wins the rally → SIDE-OUT (no point scored).
//   - Side-out rotation:
//     a) If it was the "first server of game" (0-0-2 start) → serve goes to other team, server 1.
//     b) If server 1 (playerIndex 0) lost → partner (server 2, playerIndex 1) now serves.
//     c) If server 2 (playerIndex 1) lost → full side-out to other team, server 1.
// - Player positions: right side when score is even, left side when odd.
//   After scoring, serving team players switch sides (left↔right).
//
// Two actions:
//   applyPoint(stored, umpireName) → serving team scored +1, keep serve
//   applySideOut(stored, umpireName) → receiving team won rally, rotate serve, no point

export function applyPoint(
  stored: StoredMatch,
  umpireName: string
): StoredMatch {
  const { state, events } = stored;
  if (state.status !== "GAME_IN_PROGRESS" && state.status !== "STARTED") return stored;
  if (!state.servingTeam) return stored; // must set server first

  const prevState: Partial<LiveMatchState> = {
    games: JSON.parse(JSON.stringify(state.games)),
    currentGame: state.currentGame,
    team1GamesWon: state.team1GamesWon,
    team2GamesWon: state.team2GamesWon,
    status: state.status,
    winnerId: state.winnerId,
    servingTeam: state.servingTeam,
    servingPlayer: state.servingPlayer,
    servingPlayerIndex: state.servingPlayerIndex,
    serverNumber: state.serverNumber,
    isFirstServerOfGame: state.isFirstServerOfGame,
  };

  const games = JSON.parse(JSON.stringify(state.games)) as GameScore[];
  const current = games[state.currentGame];
  // Only serving team scores
  const scoringTeam = state.servingTeam!;
  current[scoringTeam] += 1;

  // After scoring, isFirstServerOfGame is no longer true
  const newIsFirstServerOfGame = false;

  // Server score updates (serving team's new score)
  const newServerScore = scoringTeam === "team1" ? current.team1 : current.team2;

  const gameWinner = checkGameWinner(current, state.rules);
  const now = new Date().toISOString();

  let newStatus: MatchStatus = "GAME_IN_PROGRESS";
  let t1GamesWon = state.team1GamesWon;
  let t2GamesWon = state.team2GamesWon;
  let winnerId = state.winnerId;
  let newCurrentGame = state.currentGame;
  let newGames = games;

  if (gameWinner) {
    current.winner = gameWinner;
    current.completedAt = now;
    t1GamesWon = state.team1GamesWon + (gameWinner === "team1" ? 1 : 0);
    t2GamesWon = state.team2GamesWon + (gameWinner === "team2" ? 1 : 0);

    const needed = gamesNeededToWin(state.rules);
    if (t1GamesWon >= needed || t2GamesWon >= needed) {
      newStatus = "MATCH_COMPLETED";
      winnerId = gameWinner;
    } else {
      newStatus = "GAME_BREAK";
      newCurrentGame = state.currentGame + 1;
      newGames = [...games, { gameNumber: newCurrentGame + 1, team1: 0, team2: 0, startedAt: undefined }];
    }
  }

  const newState: LiveMatchState = {
    ...state,
    games: newGames,
    currentGame: newCurrentGame,
    team1GamesWon: t1GamesWon,
    team2GamesWon: t2GamesWon,
    status: newStatus,
    winnerId,
    // Serving team stays the same, same player
    servingTeam: state.servingTeam,
    servingPlayer: state.servingPlayer,
    servingPlayerIndex: state.servingPlayerIndex,
    serverNumber: state.serverNumber,
    isFirstServerOfGame: newIsFirstServerOfGame,
    serverScore: newServerScore,
    completedAt: newStatus === "MATCH_COMPLETED" ? now : undefined,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "POINT_SCORED",
    sequenceNumber: state.eventCount + 1,
    previousState: prevState,
    newState: {
      games: newState.games,
      currentGame: newState.currentGame,
      team1GamesWon: newState.team1GamesWon,
      team2GamesWon: newState.team2GamesWon,
      status: newState.status,
      winnerId: newState.winnerId,
      servingTeam: newState.servingTeam,
      servingPlayer: newState.servingPlayer,
      servingPlayerIndex: newState.servingPlayerIndex,
      serverNumber: newState.serverNumber,
    },
    metadata: { team: scoringTeam, gameNumber: state.currentGame + 1, action: "POINT" },
  };

  return { state: newState, events: [...events, event] };
}

export function applySideOut(
  stored: StoredMatch,
  umpireName: string
): StoredMatch {
  const { state, events } = stored;
  if (state.status !== "GAME_IN_PROGRESS" && state.status !== "STARTED") return stored;
  if (!state.servingTeam) return stored;

  const prevState: Partial<LiveMatchState> = {
    games: JSON.parse(JSON.stringify(state.games)),
    currentGame: state.currentGame,
    team1GamesWon: state.team1GamesWon,
    team2GamesWon: state.team2GamesWon,
    status: state.status,
    servingTeam: state.servingTeam,
    servingPlayer: state.servingPlayer,
    servingPlayerIndex: state.servingPlayerIndex,
    serverNumber: state.serverNumber,
    isFirstServerOfGame: state.isFirstServerOfGame,
  };

  // No point scored — just rotate serve
  const games = JSON.parse(JSON.stringify(state.games)) as GameScore[];

  let newServingTeam = state.servingTeam;
  let newServingPlayerIndex: 0 | 1 = state.servingPlayerIndex ?? 0;
  let newServerNumber: 1 | 2 = 1;
  let newIsFirstServerOfGame = false;

  if (state.isFirstServerOfGame) {
    // 0-0-2 rule: first server only gets 1 serve → full side-out to other team, server 1
    // NOTE: no partner rotation here — the very first side-out of the game goes straight to the other team
    newServingTeam = state.servingTeam === "team1" ? "team2" : "team1";
    newServingPlayerIndex = 0;
    newServerNumber = 1;
    newIsFirstServerOfGame = false;
  } else if (state.rules.format === "singles") {
    // Singles: just swap teams, no partner concept
    newServingTeam = state.servingTeam === "team1" ? "team2" : "team1";
    newServingPlayerIndex = 0;
    newServerNumber = 1;
  } else if (state.servingPlayerIndex === 0) {
    // Doubles: Server 1 lost → partner (server 2) gets to serve — SAME TEAM, no side-out yet
    newServingTeam = state.servingTeam;
    newServingPlayerIndex = 1;
    newServerNumber = 2;
  } else {
    // Doubles: Server 2 lost → full side-out to other team, server 1
    newServingTeam = state.servingTeam === "team1" ? "team2" : "team1";
    newServingPlayerIndex = 0;
    newServerNumber = 1;
  }

  const newServingPlayers = newServingTeam === "team1" ? state.team1Players : state.team2Players;
  const newServingPlayer = newServingPlayers[newServingPlayerIndex] ?? newServingPlayers[0];
  const newServerScore = newServingTeam === "team1" ? games[state.currentGame]?.team1 : games[state.currentGame]?.team2;

  const now = new Date().toISOString();

  const newState: LiveMatchState = {
    ...state,
    games,
    servingTeam: newServingTeam,
    servingPlayer: newServingPlayer,
    servingPlayerIndex: newServingPlayerIndex,
    serverNumber: newServerNumber,
    isFirstServerOfGame: newIsFirstServerOfGame,
    serverScore: newServerScore,
    lastUpdatedAt: now,
    eventCount: state.eventCount + 1,
  };

  const event: ScoreEvent = {
    eventId: createEventId(),
    matchId: state.matchId,
    tournamentId: state.tournamentId,
    categoryId: state.categoryId,
    actorId: umpireName,
    actorRole: "UMPIRE",
    timestamp: now,
    eventType: "MATCH_CORRECTED",
    sequenceNumber: state.eventCount + 1,
    previousState: prevState,
    newState: {
      servingTeam: newState.servingTeam,
      servingPlayer: newState.servingPlayer,
      servingPlayerIndex: newState.servingPlayerIndex,
      serverNumber: newState.serverNumber,
    },
    metadata: {
      action: "SIDE_OUT",
      prevServingTeam: state.servingTeam,
      newServingTeam,
      newServerNumber,
    },
  };

  return { state: newState, events: [...events, event] };
}

// Keep old function as alias for backwards compat (used in undo logic)
export function applyScorePointWithServeRotation(
  stored: StoredMatch,
  team: "team1" | "team2",
  umpireName: string
): StoredMatch {
  // In side-out scoring, we only call applyPoint (serving team scores)
  // This alias is kept so existing undo events still work
  return applyPoint(stored, umpireName);
}

// ── Utility ───────────────────────────────────────────────────────────────────

export function formatMatchScore(state: LiveMatchState): string {
  return state.games
    .filter((g) => g.winner || g === state.games[state.currentGame])
    .map((g) => `${g.team1}-${g.team2}`)
    .join(", ");
}

export function getServingCallout(state: LiveMatchState): string {
  if (!state.servingTeam) return "";
  const current = state.games[state.currentGame];
  if (!current) return "";
  const serverScore = state.servingTeam === "team1" ? current.team1 : current.team2;
  const receiverScore = state.servingTeam === "team1" ? current.team2 : current.team1;
  // If serverNumber is not set yet, default to 2 (0-0-2 start)
  const serverNum = state.serverNumber !== undefined ? state.serverNumber : 2;
  // Pickleball callout: server score - receiver score - server number
  if (state.rules.format === "doubles") {
    return `${serverScore} - ${receiverScore} - ${serverNum}`;
  }
  return `${serverScore} - ${receiverScore}`;
}

export function canUndo(stored: StoredMatch): boolean {
  const reversedIds = new Set(
    stored.events
      .filter((e) => e.isReversal && e.metadata?.reversedEventId)
      .map((e) => e.metadata!.reversedEventId as string)
  );
  return stored.events.some(
    (e) => e.eventType === "POINT_SCORED" && !reversedIds.has(e.eventId)
  );
}
