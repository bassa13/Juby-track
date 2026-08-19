import { memo } from 'react';
import { BALL_HEX, BALL_VALUES, COLOR_ORDER, type LiveFrameAction, type LiveFrameState } from './types.ts';
import { getLegalPots } from './snookerEngine.ts';

const TOTAL_REDS = 15;

export interface BallTrackerProps {
  state: LiveFrameState;
  /** Optional — omit to render a read-only tracker (e.g. an embedded preview). */
  dispatch?: (action: LiveFrameAction) => void;
}

export const BallTracker = memo(function BallTracker({ state, dispatch }: BallTrackerProps) {
  const legal = getLegalPots(state);
  const redOn = legal.red;
  const canRestoreRed = state.phase === 'reds' && state.redsRemaining < TOTAL_REDS;

  return (
    <div className="tv-balls" aria-label="Ball tracker">
      <div className="tv-balls-row">
        {/* Single red ball, same size/style as the colours, with a live count
            badge instead of 15 separate circles — clicking it pots one red,
            the small restore control gives one back if it was a mistake. */}
        <div className="tv-ball-group">
          <button
            type="button"
            className={`tv-ball color red${redOn ? ' on' : ''}${state.redsRemaining === 0 ? ' potted' : ''}`}
            style={{ background: BALL_HEX.red }}
            title={`Red — ${BALL_VALUES.red} (${state.redsRemaining} left)`}
            onClick={() => dispatch?.({ type: 'POT_RED' })}
            // Only truly disabled in read-only preview mode (no dispatch). Whether
            // potting a red is *currently* legal is enforced by the engine itself
            // (an off-turn click is a safe no-op), so the ball always keeps the
            // exact same plain, clean look as the six colour balls — no native
            // disabled greying flickering on and off between turns.
            disabled={!dispatch}
          />
          <span className="tv-ball-count">×{state.redsRemaining}</span>
          {dispatch && (
            <button
              type="button"
              className="tv-ball-restore"
              title="Restore a red ball (miscount correction)"
              onClick={() => dispatch({ type: 'RESTORE_RED' })}
              disabled={!canRestoreRed}
            >
              ↺
            </button>
          )}
        </div>

        {COLOR_ORDER.map((color, idx) => {
          const permanentlyPotted =
            state.phase === 'colors' || state.phase === 'respottedBlack' || state.phase === 'finished' ? idx < state.colorIndex : false;
          const isOn = legal.colors.includes(color);
          return (
            <span
              key={color}
              className={`tv-ball color${permanentlyPotted ? ' potted' : ''}${isOn ? ' on' : ''}`}
              style={{ background: BALL_HEX[color] }}
              title={`${color} — ${BALL_VALUES[color]}`}
            />
          );
        })}
      </div>
    </div>
  );
});
