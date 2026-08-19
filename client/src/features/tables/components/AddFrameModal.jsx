import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName, fmt } from '../../../core/utils/timeUtils.js';
import { computeGameCost } from '../../../core/utils/costCalculator.js';

export function AddFrameModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const tables = useJubyStore((state) => state.tables);
  const settings = useJubyStore((state) => state.settings);
  const addFrame = useJubyStore((state) => state.addFrame);

  const [winner, setWinner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const game = pendingAction?.type === 'addFrame' ? games.find(g => String(g.id) === String(pendingAction.gameId)) : null;
  if (!game) return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleConfirm = () => {
    setIsSubmitting(true);
    const res = addFrame(game.id, winner);
    setIsSubmitting(false);
    if (res.success) {
      setPendingAction(null);
    }
  };

  const gameCost = computeGameCost(game, settings, tables);
  const gamePlayers = game.players.map(pid => players.find(x => x.id === pid));

  const score1 = game.frameWins?.[game.players[0]] || 0;
  const score2 = game.frameWins?.[game.players[1]] || 0;

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('add_frame')}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="cost-display" style={{ marginBottom: '14px' }}>
            <div className="lbl">📊 {t('score')} ({game.frames} frames · {fmt(gameCost)}dh)</div>
            <div className="num">{score1}-{score2}</div>
          </div>

          <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('winner_q')}</label>
          <div className="options-grid">
            {gamePlayers.map(p => {
              if (!p) return null;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`option-btn ${winner === p.id ? 'selected' : ''}`}
                  onClick={() => setWinner(p.id)}
                >
                  {fullName(p)}
                </button>
              );
            })}
            <button
              type="button"
              className={`option-btn ${winner === null ? 'selected' : ''}`}
              onClick={() => setWinner(null)}
            >
              {t('no_winner')}
            </button>
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Saving...' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
