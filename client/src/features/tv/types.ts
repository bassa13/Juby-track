// TV Scoreboard / live snooker scoring — shared types.
//
// These types describe the *live, ball-by-ball* frame state that drives the
// TV scoreboard and its remote control. This is intentionally separate from
// the existing `game` record in useJubyStore (frames/frameWins/frameRecords),
// which only tracks frame-level results for billing & history. The two meet
// at exactly one point: when a frame finishes here, we call the store's
// existing `addFrame(gameId, winnerId)` action so billing/history keep
// working exactly as before — this feature never overrides that logic.

export type BallColor = 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black';

export const BALL_VALUES: Record<BallColor, number> = {
  red: 1,
  yellow: 2,
  green: 3,
  brown: 4,
  blue: 5,
  pink: 6,
  black: 7,
};

export const BALL_HEX: Record<BallColor, string> = {
  red: '#e53935',
  yellow: '#f4d03f',
  green: '#27ae60',
  brown: '#6b4226',
  blue: '#2980ff',
  pink: '#ff6fa5',
  black: '#111318',
};

// Order colours are potted in once all reds are gone.
export const COLOR_ORDER: BallColor[] = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];

export type FramePhase = 'reds' | 'colors' | 'respottedBlack' | 'finished';

export interface PlayerSlot {
  id: string;
  name: string;
}

export interface BreakInfo {
  playerId: string | null;
  value: number;
}

/** One entry in the undo stack: a full snapshot taken *before* an action. */
export type LiveFrameSnapshot = Omit<LiveFrameState, 'history'>;

export interface LiveFrameState {
  tableId: string;
  gameId: string | null;
  tournamentName: string;
  players: [PlayerSlot, PlayerSlot];
  activePlayerIndex: 0 | 1;
  redsRemaining: number;
  phase: FramePhase;
  colorIndex: number; // index into COLOR_ORDER once phase === 'colors'
  onColor: boolean; // during 'reds' phase: true if the next legal ball is a colour
  scores: [number, number];
  currentBreak: BreakInfo;
  highestBreak: [number, number];
  frameWins: [number, number]; // mirrors table frame wins, for the "frames" display
  winnerIndex: 0 | 1 | null;
  timer: {
    runningSince: number | null; // Date.now() when started, null if paused
    elapsedMs: number; // accumulated elapsed time while paused
  };
  history: LiveFrameSnapshot[];
  updatedAt: number;
}

// ---- Realtime broadcast event payloads (small, not full-state) ----

export type LiveFrameAction =
  | { type: 'POT_RED' }
  // Pure ball-count correction (does not touch score/break) — e.g. the
  // scoreboard operator miscounted reds. A genuine potting mistake (wrong
  // score awarded) should still go through the generic UNDO instead.
  | { type: 'RESTORE_RED' }
  | { type: 'POT_COLOR'; color: BallColor }
  // The remote's dedicated Red/Green buttons are a flat "+1 to this player"
  // quick-correct, independent of the ball tracker (spec: "Red = Player 1 +1").
  // Precise scoring should use the numbered ball keys (1-7) instead.
  | { type: 'MANUAL_POINT'; playerIndex: 0 | 1 }
  | { type: 'UNDO' }
  | { type: 'NEXT_PLAYER' }
  | { type: 'TIMER_TOGGLE' }
  | { type: 'TIMER_RESET' }
  | { type: 'RESET_FRAME' }
  | { type: 'SET_TOURNAMENT_NAME'; name: string }
  | { type: 'SET_PLAYERS'; players: [PlayerSlot, PlayerSlot] };

export interface BroadcastEnvelope {
  action: LiveFrameAction;
  senderId: string; // random per-tab id, so a sender can ignore its own echo if needed
  sentAt: number;
}

export interface RemainingPointsInfo {
  remainingPoints: number;
  deficit: number; // leader score - trailing score (>= 0)
  trailingPlayerIndex: 0 | 1 | null;
  needsSnookers: boolean;
  snookersRequired: number; // 0 when not applicable
}
