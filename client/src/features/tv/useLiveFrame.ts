import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAction, createInitialFrame, getElapsedMs } from './snookerEngine.ts';
import { connectLiveFrameChannel, loadLiveFrameSnapshot, saveLiveFrameSnapshot, type ConnectionStatus } from './liveFrameChannel.ts';
import type { LiveFrameAction, LiveFrameState, PlayerSlot } from './types.ts';

const SNAPSHOT_DEBOUNCE_MS = 800;

export interface UseLiveFrameOptions {
  tableId: string;
  gameId: string | null;
  players: [PlayerSlot, PlayerSlot];
  tournamentName?: string;
  frameWins?: [number, number];
  /** Called exactly once per frame, the moment a winner is decided. */
  onFrameFinished?: (winnerPlayerId: string) => void;
}

export interface UseLiveFrameResult {
  state: LiveFrameState;
  dispatch: (action: LiveFrameAction) => void;
  elapsedMs: number;
  connected: boolean;
  connectionStatus: ConnectionStatus;
}

export function useLiveFrame(opts: UseLiveFrameOptions): UseLiveFrameResult {
  const { tableId, gameId, players, tournamentName, frameWins, onFrameFinished } = opts;

  const [state, setState] = useState<LiveFrameState>(() =>
    createInitialFrame({ tableId, gameId, players, tournamentName, frameWins })
  );
  const [, forceTick] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const channelRef = useRef<ReturnType<typeof connectLiveFrameChannel> | null>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedNotifiedRef = useRef(false);
  const hydratedRef = useRef(false);

  // Connect the broadcast channel once per table. Exactly one channel is
  // opened per effect run, and the cleanup below always tears it down first —
  // this is what keeps StrictMode's mount/unmount/mount dance (and any
  // tableId/gameId change) from ever leaving two live subscriptions open at
  // once (duplicate subscriptions would otherwise double-apply every action).
  useEffect(() => {
    finishedNotifiedRef.current = false;
    hydratedRef.current = false;

    const channel = connectLiveFrameChannel(tableId, {
      onAction: (action) => setState((prev) => applyAction(prev, action)),
      onStatusChange: setConnectionStatus,
    });
    channelRef.current = channel;

    // Rehydrate from the last durable snapshot (covers reload / late-open).
    loadLiveFrameSnapshot(tableId).then((snap) => {
      if (snap && snap.gameId === gameId && !hydratedRef.current) {
        hydratedRef.current = true;
        setState(snap);
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, gameId]);

  // Re-initialize local state when the underlying game/players change (new frame started elsewhere).
  useEffect(() => {
    setState(createInitialFrame({ tableId, gameId, players, tournamentName, frameWins }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, gameId]);

  // Tick every second so the timer display stays live while running.
  useEffect(() => {
    if (!state.timer.runningSince) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [state.timer.runningSince]);

  // Notify once when a winner is decided.
  useEffect(() => {
    if (state.winnerIndex !== null && !finishedNotifiedRef.current) {
      finishedNotifiedRef.current = true;
      onFrameFinished?.(state.players[state.winnerIndex].id);
    }
  }, [state.winnerIndex, state.players, onFrameFinished]);

  // Debounced durable snapshot (never on the hot path — see liveFrameChannel.ts).
  useEffect(() => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      saveLiveFrameSnapshot(tableId, gameId, state);
    }, SNAPSHOT_DEBOUNCE_MS);
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, [state, tableId, gameId]);

  const dispatch = useCallback((action: LiveFrameAction) => {
    setState((prev) => applyAction(prev, action));
    channelRef.current?.publish(action);
  }, []);

  const connected = connectionStatus === 'connected' || connectionStatus === 'local';
  return { state, dispatch, elapsedMs: getElapsedMs(state), connected, connectionStatus };
}
