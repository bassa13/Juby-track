import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJubyStore } from '../../core/store/useJubyStore.js';
import { fullName } from '../../core/utils/timeUtils.js';
import { useLiveFrame } from './useLiveFrame.ts';
import type { ConnectionStatus } from './liveFrameChannel.ts';
import { useRemoteControl } from './useRemoteControl.ts';
import { computeRemainingPoints, getLegalPots } from './snookerEngine.ts';
import { BallTracker } from './BallTracker.tsx';
import { COLOR_ORDER, type BallColor, type PlayerSlot } from './types.ts';
import './tv.css';

interface GridButton {
  key: string;
  label: string;
  cls: string;
  kind: 'always' | 'ball' | 'color';
  color?: BallColor;
  run: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function useFullscreenAndWakeLock() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const enter = useCallback(() => {
    const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
    el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {
      // Most TV browsers block programmatic fullscreen without a user gesture —
      // the on-screen "press OK for fullscreen" hint covers that case.
    });
  }, []);

  useEffect(() => {
    enter();
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);

    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((lock) => {
      wakeLockRef.current = lock;
    }).catch(() => {
      // Not supported on this platform — acceptable, most TVs don't sleep while an app is foregrounded anyway.
    });

    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, [enter]);

  return { isFullscreen, enter };
}

interface TVScoreboardProps {
  tableId: string;
}

export function TVScoreboard({ tableId }: TVScoreboardProps) {
  const table = useJubyStore((s) => s.tables.find((t: { id: string }) => t.id === tableId));
  const activeGame = useJubyStore((s) => s.games.find((g: { tableId: string; endTime: number | null }) => g.tableId === tableId && !g.endTime));
  const players = useJubyStore((s) => s.players);
  const settings = useJubyStore((s) => s.settings);
  const addFrame = useJubyStore((s) => s.addFrame);

  const { isFullscreen, enter } = useFullscreenAndWakeLock();

  const playerSlots = useMemo<[PlayerSlot, PlayerSlot]>(() => {
    if (activeGame && activeGame.players.length === 2) {
      const [p1id, p2id] = activeGame.players;
      const p1 = players.find((p: { id: string }) => p.id === p1id);
      const p2 = players.find((p: { id: string }) => p.id === p2id);
      return [
        { id: p1id, name: p1 ? fullName(p1) : 'Player 1' },
        { id: p2id, name: p2 ? fullName(p2) : 'Player 2' },
      ];
    }
    return [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' },
    ];
  }, [activeGame, players]);

  const frameWins = useMemo<[number, number]>(() => {
    if (!activeGame?.frameWins) return [0, 0];
    return [activeGame.frameWins[playerSlots[0].id] || 0, activeGame.frameWins[playerSlots[1].id] || 0];
  }, [activeGame, playerSlots]);

  const onFrameFinished = useCallback(
    (winnerPlayerId: string) => {
      if (activeGame) addFrame(activeGame.id, winnerPlayerId);
    },
    [activeGame, addFrame]
  );

  const { state, dispatch, elapsedMs, connectionStatus } = useLiveFrame({
    tableId,
    gameId: activeGame?.id ?? null,
    players: playerSlots,
    tournamentName: settings?.tournamentName ?? '',
    frameWins,
    onFrameFinished,
  });

  // ---- On-screen remote fallback: a logical (not DOM) focus grid ----
  const grid = useMemo<GridButton[][]>(
    () => [
      [
        { key: 'red', label: '🔴 P1 +1', cls: 'red', kind: 'always', run: () => dispatch({ type: 'MANUAL_POINT', playerIndex: 0 }) },
        { key: 'green', label: '🟢 P2 +1', cls: 'green', kind: 'always', run: () => dispatch({ type: 'MANUAL_POINT', playerIndex: 1 }) },
        { key: 'yellow', label: '↩ Undo', cls: 'yellow', kind: 'always', run: () => dispatch({ type: 'UNDO' }) },
        { key: 'blue', label: '⇄ Next player', cls: 'blue', kind: 'always', run: () => dispatch({ type: 'NEXT_PLAYER' }) },
      ],
      [
        { key: 'red-ball', label: 'Red', cls: '', kind: 'ball', run: () => dispatch({ type: 'POT_RED' }) },
        ...COLOR_ORDER.map((c): GridButton => ({
          key: c,
          label: `${c[0].toUpperCase()}${c.slice(1)}`,
          cls: '',
          kind: 'color',
          color: c,
          run: () => dispatch({ type: 'POT_COLOR', color: c }),
        })),
      ],
      [
        { key: 'timer', label: state.timer.runningSince ? '⏸ Pause' : '▶ Start', cls: '', kind: 'always', run: () => dispatch({ type: 'TIMER_TOGGLE' }) },
        { key: 'reset', label: '0 Reset timer', cls: '', kind: 'always', run: () => dispatch({ type: 'TIMER_RESET' }) },
        { key: 'next-frame', label: 'Next frame', cls: '', kind: 'always', run: () => dispatch({ type: 'RESET_FRAME' }) },
        { key: 'fullscreen', label: '⛶ Fullscreen', cls: '', kind: 'always', run: enter },
      ],
    ],
    [dispatch, state.timer.runningSince, enter]
  );

  const [focus, setFocus] = useState({ row: 0, col: 0 });

  const onNavigate = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      setFocus((prev) => {
        let { row, col } = prev;
        if (dir === 'up') row = Math.max(0, row - 1);
        if (dir === 'down') row = Math.min(grid.length - 1, row + 1);
        col = Math.min(col, grid[row].length - 1);
        if (dir === 'left') col = Math.max(0, col - 1);
        if (dir === 'right') col = Math.min(grid[row].length - 1, col + 1);
        return { row, col };
      });
    },
    [grid]
  );

  const onConfirm = useCallback(() => {
    grid[focus.row]?.[focus.col]?.run();
  }, [grid, focus]);

  const onBack = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useRemoteControl({ dispatch, onNavigate, onConfirm, onBack }, Boolean(table && table.type === 'snooker'));

  const legal = getLegalPots(state);
  const remaining = computeRemainingPoints(state);

  if (!table) {
    return (
      <div className="tv-root">
        <div className="tv-idle">Table not found.</div>
      </div>
    );
  }
  if (table.type !== 'snooker') {
    return (
      <div className="tv-root">
        <div className="tv-idle">TV Display is only available for snooker tables.</div>
      </div>
    );
  }
  if (table.tvEnabled === false) {
    return (
      <div className="tv-root">
        <div className="tv-idle">TV Display is disabled for {table.label}.</div>
      </div>
    );
  }

  return (
    <div className="tv-root" onClick={enter}>
      <div className="tv-topbar">
        <div className="tv-brand"><span className="logo-dot" />JUBY CLUB</div>
        {state.tournamentName ? <div className="tv-tournament">{state.tournamentName}</div> : <span />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ConnectionBadge status={connectionStatus} />
          <div className="tv-tablebadge">🎯 {table.label}</div>
        </div>
      </div>

      {!activeGame ? (
        <div className="tv-idle">Waiting for a match to start on {table.label}…</div>
      ) : (
        <>
          <div className="tv-main">
            <PlayerPanel
              slot={state.players[0]}
              score={state.scores[0]}
              frames={state.frameWins[0]}
              currentBreak={state.currentBreak.playerId === state.players[0].id ? state.currentBreak.value : 0}
              highestBreak={state.highestBreak[0]}
              isActive={state.activePlayerIndex === 0 && state.phase !== 'finished'}
              isWinner={state.winnerIndex === 0}
            />

            <div className="tv-center">
              <div className={`tv-timer${state.timer.runningSince ? '' : ' paused'}`}>{formatDuration(elapsedMs)}</div>
              <div className="tv-vs">VS</div>
              <BallTracker state={state} dispatch={dispatch} />
              {remaining.needsSnookers && remaining.trailingPlayerIndex !== null && state.phase !== 'finished' && (
                <div className="tv-snookers-banner">
                  {state.players[remaining.trailingPlayerIndex].name} needs {remaining.snookersRequired} snooker
                  {remaining.snookersRequired > 1 ? 's' : ''}
                </div>
              )}
              {state.winnerIndex !== null && (
                <div className="tv-winner-banner">🏆 {state.players[state.winnerIndex].name} wins the frame!</div>
              )}
            </div>

            <PlayerPanel
              slot={state.players[1]}
              score={state.scores[1]}
              frames={state.frameWins[1]}
              currentBreak={state.currentBreak.playerId === state.players[1].id ? state.currentBreak.value : 0}
              highestBreak={state.highestBreak[1]}
              isActive={state.activePlayerIndex === 1 && state.phase !== 'finished'}
              isWinner={state.winnerIndex === 1}
            />
          </div>

          <div className="tv-remote">
            {grid.map((row, r) => (
              <div className="tv-remote-row" key={r}>
                {row.map((btn, c) => {
                  const disabled =
                    btn.kind === 'ball' ? !legal.red : btn.kind === 'color' && btn.color ? !legal.colors.includes(btn.color) : false;
                  return (
                    <button
                      key={btn.key}
                      type="button"
                      className={`tv-remote-btn ${btn.cls}${focus.row === r && focus.col === c ? ' focused' : ''}`}
                      onClick={btn.run}
                      disabled={disabled}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {!isFullscreen && <div className="tv-fullscreen-hint">Press OK or tap the screen for fullscreen</div>}
    </div>
  );
}

const PlayerPanel = memo(function PlayerPanel({
  slot,
  score,
  frames,
  currentBreak,
  highestBreak,
  isActive,
  isWinner,
}: {
  slot: PlayerSlot;
  score: number;
  frames: number;
  currentBreak: number;
  highestBreak: number;
  isActive: boolean;
  isWinner: boolean;
}) {
  return (
    <div className={`tv-player${isActive ? ' active' : ''}${isWinner ? ' winner' : ''}`}>
      <div className="tv-player-name">{slot.name}</div>
      <div className="tv-player-score">{score}</div>
      <div className="tv-player-frames">
        Frames: <b>{frames}</b>
      </div>
      <div className="tv-player-breaks">
        <span>
          Break<b>{currentBreak}</b>
        </span>
        <span>
          Highest<b>{highestBreak}</b>
        </span>
      </div>
    </div>
  );
});

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Live',
  reconnecting: 'Reconnecting…',
  unavailable: 'Offline',
  local: 'Local only (no Supabase)',
};

const ConnectionBadge = memo(function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span className={`tv-connection-badge ${status}`} title="Realtime sync status">
      <span className="tv-connection-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
});
