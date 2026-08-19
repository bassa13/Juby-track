// Pure, dependency-free snooker scoring engine.
//
// Everything here is a pure function over LiveFrameState — no React, no
// Supabase, no timers running inside it. That makes it trivial to unit-test
// and to run identically on both the admin side and the TV side (every
// client applies the exact same reducer to the exact same broadcast event,
// which is what keeps the two in sync without shipping full-state payloads).

import {
  BALL_VALUES,
  COLOR_ORDER,
  type BallColor,
  type LiveFrameAction,
  type LiveFrameSnapshot,
  type LiveFrameState,
  type PlayerSlot,
  type RemainingPointsInfo,
} from './types.ts';

const TOTAL_REDS = 15;
const COLORS_SUM = COLOR_ORDER.reduce((sum, c) => sum + BALL_VALUES[c], 0); // 27
const MAX_HISTORY = 50;

export function createInitialFrame(params: {
  tableId: string;
  gameId: string | null;
  players: [PlayerSlot, PlayerSlot];
  tournamentName?: string;
  frameWins?: [number, number];
}): LiveFrameState {
  return {
    tableId: params.tableId,
    gameId: params.gameId,
    tournamentName: params.tournamentName ?? '',
    players: params.players,
    activePlayerIndex: 0,
    redsRemaining: TOTAL_REDS,
    phase: 'reds',
    colorIndex: 0,
    onColor: false,
    scores: [0, 0],
    currentBreak: { playerId: null, value: 0 },
    highestBreak: [0, 0],
    frameWins: params.frameWins ?? [0, 0],
    winnerIndex: null,
    timer: { runningSince: null, elapsedMs: 0 },
    history: [],
    updatedAt: Date.now(),
  };
}

function snapshot(state: LiveFrameState): LiveFrameSnapshot {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { history, ...rest } = state;
  // Plain JSON clone rather than structuredClone: the latter isn't available
  // on the older Chromium/WebKit builds some Smart TV browsers (Tizen, webOS)
  // still ship, and every field here is plain JSON-safe data anyway.
  return JSON.parse(JSON.stringify(rest));
}

function pushHistory(state: LiveFrameState): LiveFrameSnapshot[] {
  const next = [...state.history, snapshot(state)];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

/** Which balls are currently legal to record as potted. */
export function getLegalPots(state: LiveFrameState): { red: boolean; colors: BallColor[] } {
  if (state.phase === 'reds') {
    if (state.onColor) return { red: false, colors: [...COLOR_ORDER] }; // any colour, free choice
    return { red: state.redsRemaining > 0, colors: [] };
  }
  if (state.phase === 'colors') {
    const c = COLOR_ORDER[state.colorIndex];
    return { red: false, colors: c ? [c] : [] };
  }
  if (state.phase === 'respottedBlack') {
    return { red: false, colors: ['black'] };
  }
  return { red: false, colors: [] }; // finished
}

function addToActivePlayer(state: LiveFrameState, value: number): LiveFrameState {
  const scores: [number, number] = [...state.scores] as [number, number];
  scores[state.activePlayerIndex] += value;
  const currentBreak = {
    playerId: state.players[state.activePlayerIndex].id,
    value: state.currentBreak.value + value,
  };
  return { ...state, scores, currentBreak };
}

function finalizeFrame(state: LiveFrameState, winnerIndex: 0 | 1): LiveFrameState {
  const highestBreak: [number, number] = [...state.highestBreak] as [number, number];
  const idx = state.activePlayerIndex;
  if (state.currentBreak.playerId === state.players[idx].id) {
    highestBreak[idx] = Math.max(highestBreak[idx], state.currentBreak.value);
  }
  return {
    ...state,
    phase: 'finished',
    winnerIndex,
    highestBreak,
    currentBreak: { playerId: null, value: 0 },
  };
}

export function applyAction(state: LiveFrameState, action: LiveFrameAction): LiveFrameState {
  const now = Date.now();

  switch (action.type) {
    case 'POT_RED': {
      const legal = getLegalPots(state);
      if (!legal.red) return state;
      const withHist = { ...state, history: pushHistory(state) };
      const potted = addToActivePlayer(withHist, BALL_VALUES.red);
      return { ...potted, redsRemaining: potted.redsRemaining - 1, onColor: true, updatedAt: now };
    }

    case 'RESTORE_RED': {
      if (state.phase !== 'reds' || state.redsRemaining >= TOTAL_REDS) return state;
      const withHist = { ...state, history: pushHistory(state) };
      return { ...withHist, redsRemaining: withHist.redsRemaining + 1, updatedAt: now };
    }

    case 'POT_COLOR': {
      const legal = getLegalPots(state);
      const isLegal =
        (state.phase === 'reds' && legal.colors.includes(action.color)) ||
        (state.phase === 'colors' && legal.colors[0] === action.color) ||
        (state.phase === 'respottedBlack' && action.color === 'black');
      if (!isLegal) return state;

      const withHist = { ...state, history: pushHistory(state) };
      const potted = addToActivePlayer(withHist, BALL_VALUES[action.color]);

      if (state.phase === 'respottedBlack') {
        // Sudden-death: whoever pots the respotted black wins the frame outright.
        return finalizeFrame(potted, state.activePlayerIndex);
      }

      if (state.phase === 'reds') {
        if (potted.redsRemaining > 0) {
          // Colour respotted, back to needing a red next.
          return { ...potted, onColor: false, updatedAt: now };
        }
        // That was the last red's follow-colour — move into the colours phase.
        return { ...potted, phase: 'colors', colorIndex: 0, onColor: true, updatedAt: now };
      }

      // phase === 'colors'
      const nextColorIndex = potted.colorIndex + 1;
      if (nextColorIndex >= COLOR_ORDER.length) {
        // Black just potted — frame over, unless scores are level (respotted black).
        if (potted.scores[0] === potted.scores[1]) {
          return { ...potted, phase: 'respottedBlack', colorIndex: nextColorIndex, updatedAt: now };
        }
        const winner: 0 | 1 = potted.scores[0] > potted.scores[1] ? 0 : 1;
        return finalizeFrame({ ...potted, colorIndex: nextColorIndex }, winner);
      }
      return { ...potted, colorIndex: nextColorIndex, updatedAt: now };
    }

    case 'MANUAL_POINT': {
      if (state.phase === 'finished') return state;
      const withHist = { ...state, history: pushHistory(state) };
      const scores: [number, number] = [...withHist.scores] as [number, number];
      scores[action.playerIndex] += 1;
      const currentBreak =
        withHist.players[action.playerIndex].id === withHist.currentBreak.playerId
          ? { playerId: withHist.currentBreak.playerId, value: withHist.currentBreak.value + 1 }
          : { playerId: withHist.players[action.playerIndex].id, value: 1 };
      return { ...withHist, scores, currentBreak, updatedAt: now };
    }

    case 'NEXT_PLAYER': {
      if (state.phase === 'finished') return state;
      const withHist = { ...state, history: pushHistory(state) };
      const highestBreak: [number, number] = [...withHist.highestBreak] as [number, number];
      const idx = withHist.activePlayerIndex;
      if (withHist.currentBreak.playerId === withHist.players[idx].id) {
        highestBreak[idx] = Math.max(highestBreak[idx], withHist.currentBreak.value);
      }
      return {
        ...withHist,
        activePlayerIndex: idx === 0 ? 1 : 0,
        currentBreak: { playerId: null, value: 0 },
        highestBreak,
        updatedAt: now,
      };
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return { ...prev, history: state.history.slice(0, -1) };
    }

    case 'TIMER_TOGGLE': {
      if (state.timer.runningSince) {
        const elapsedMs = state.timer.elapsedMs + (now - state.timer.runningSince);
        return { ...state, timer: { runningSince: null, elapsedMs }, updatedAt: now };
      }
      return { ...state, timer: { runningSince: now, elapsedMs: state.timer.elapsedMs }, updatedAt: now };
    }

    case 'TIMER_RESET': {
      return {
        ...state,
        timer: { runningSince: state.timer.runningSince ? now : null, elapsedMs: 0 },
        updatedAt: now,
      };
    }

    case 'RESET_FRAME': {
      return {
        ...createInitialFrame({
          tableId: state.tableId,
          gameId: state.gameId,
          players: state.players,
          tournamentName: state.tournamentName,
          frameWins: state.frameWins,
        }),
        updatedAt: now,
      };
    }

    case 'SET_TOURNAMENT_NAME': {
      return { ...state, tournamentName: action.name, updatedAt: now };
    }

    case 'SET_PLAYERS': {
      return { ...state, players: action.players, updatedAt: now };
    }

    default:
      return state;
  }
}

/** Live elapsed match time in ms, accounting for a currently-running timer. */
export function getElapsedMs(state: LiveFrameState, now = Date.now()): number {
  if (state.timer.runningSince) return state.timer.elapsedMs + (now - state.timer.runningSince);
  return state.timer.elapsedMs;
}

/**
 * Points left on the table, and whether the trailing player now needs
 * snooker(s) to have any realistic chance of winning the frame.
 *
 * Convention (same one used by most TV snooker graphics): each remaining red
 * is valued at 8 (1 for the red + a theoretical follow-on black) while reds
 * remain, plus the full value of the six colours (27). Once only colours are
 * left, it's just the sum of the colours still on the table. "Snookers
 * required" is an estimate — real snooker scoreboards show the same kind of
 * approximation, since the exact number depends on shots not yet played.
 */
export function computeRemainingPoints(state: LiveFrameState): RemainingPointsInfo {
  let remainingPoints = 0;
  if (state.phase === 'reds') {
    remainingPoints = state.redsRemaining * (BALL_VALUES.red + BALL_VALUES.black) + COLORS_SUM;
  } else if (state.phase === 'colors') {
    remainingPoints = COLOR_ORDER.slice(state.colorIndex).reduce((sum, c) => sum + BALL_VALUES[c], 0);
  } else {
    remainingPoints = 0;
  }

  const [s0, s1] = state.scores;
  const leaderIndex: 0 | 1 = s0 >= s1 ? 0 : 1;
  const trailingIndex: 0 | 1 = leaderIndex === 0 ? 1 : 0;
  const deficit = Math.max(0, state.scores[leaderIndex] - state.scores[trailingIndex]);

  if (deficit === 0 || remainingPoints === 0 || state.phase === 'finished') {
    return { remainingPoints, deficit, trailingPlayerIndex: deficit > 0 ? trailingIndex : null, needsSnookers: false, snookersRequired: 0 };
  }

  const needsSnookers = remainingPoints < deficit;
  const SWING_PER_SNOOKER = BALL_VALUES.black + 1; // 8, matches the "red worth 8" convention above
  const snookersRequired = needsSnookers ? Math.max(1, Math.ceil((deficit - remainingPoints) / SWING_PER_SNOOKER) + 1) : 0;

  return {
    remainingPoints,
    deficit,
    trailingPlayerIndex: trailingIndex,
    needsSnookers,
    snookersRequired,
  };
}
