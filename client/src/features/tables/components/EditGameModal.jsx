import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName, fmtTimestamp, durationStr } from '../../../core/utils/timeUtils.js';
import { computeCharges } from '../../../core/utils/costCalculator.js';

export function EditGameModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const tables = useJubyStore((state) => state.tables);
  const settings = useJubyStore((state) => state.settings);
  const editGame = useJubyStore((state) => state.editGame);
  const currentUser = useJubyStore((state) => state.currentUser);

  const game = pendingAction?.type === 'editGame' ? games.find(g => String(g.id) === String(pendingAction.gameId)) : null;

  const [scoreA, setScoreA] = useState(() => game && game.score ? (game.score[game.players[0]] || 0) : 0);
  const [scoreB, setScoreB] = useState(() => game && game.players[1] && game.score ? (game.score[game.players[1]] || 0) : 0);
  const [winnerId, setWinnerId] = useState(() => game ? (game.winnerId || null) : null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!game || currentUser?.role !== 'admin') return null;

  // Update winner automatically based on scores for 8ball 2-player when scores change
  const handleScoreChange = (type, val) => {
    const newVal = Math.max(0, parseInt(val) || 0);
    let s1 = type === 'A' ? newVal : scoreA;
    let s2 = type === 'B' ? newVal : scoreB;
    
    if (type === 'A') setScoreA(newVal);
    else setScoreB(newVal);

    if (game.type === '8ball' && game.players.length === 2) {
      if (s1 === s2) {
        setWinnerId(null);
      } else {
        setWinnerId(s1 > s2 ? game.players[0] : game.players[1]);
      }
    }
  };

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleSave = () => {
    setIsSubmitting(true);
    const updatedScore = {};
    if (game.players[0]) updatedScore[game.players[0]] = scoreA;
    if (game.players[1]) updatedScore[game.players[1]] = scoreB;

    const res = editGame(game.id, {
      score: updatedScore,
      winnerId,
      reason
    });

    setIsSubmitting(false);
    if (res.success) {
      setPendingAction(null);
    }
  };

  const table = tables.find(t => t.id === game.tableId);
  const p1 = players.find(p => p.id === game.players[0]);
  const p2 = players.find(p => p.id === game.players[1]);

  const rawCharges = computeCharges(game, settings, tables);
  const totalCost = Object.values(rawCharges).reduce((a, b) => a + b, 0);

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>✏️ {t('edit_game_title') || 'Modifier la partie'}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="game-summary-box" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <strong>{table?.label || game.tableId}</strong>
              <span className="muted">{fmtTimestamp(game.startTime)}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              ⏱ {durationStr(game.startTime, game.endTime)} · 💰 Total: <b>{totalCost} dh</b>
            </div>
          </div>

          {/* Scores Edit */}
          {game.players.length > 0 && (
            <div className="field" style={{ marginBottom: '16px' }}>
              <label>{t('score') || 'Score'}</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>{p1 ? fullName(p1) : 'Joueur 1'}</span>
                  <input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => handleScoreChange('A', e.target.value)}
                  />
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', paddingTop: '18px' }}>-</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>{p2 ? fullName(p2) : 'Joueur 2'}</span>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => handleScoreChange('B', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Winner Selector */}
          <div className="field" style={{ marginBottom: '16px' }}>
            <label>{t('winner_q') || 'Vainqueur'}</label>
            <select value={winnerId || ''} onChange={(e) => setWinnerId(e.target.value || null)}>
              <option value="">{t('no_winner') || 'Aucun (Égalité)'}</option>
              {p1 && <option value={p1.id}>{fullName(p1)}</option>}
              {p2 && <option value={p2.id}>{fullName(p2)}</option>}
            </select>
          </div>

          {/* Reason input for audit */}
          <div className="field">
            <label>Motif de la modification</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Erreur de saisie score par le caissier"
            />
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? '⏳ enregistrement...' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
