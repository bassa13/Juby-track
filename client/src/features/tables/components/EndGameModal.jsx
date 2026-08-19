import { useState, useEffect } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName, fmt, durationStr } from '../../../core/utils/timeUtils.js';
import { computeGameCost, computeCharges, gameDiscount, compute8BallRaw, isStaffClient } from '../../../core/utils/costCalculator.js';

export function EndGameModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const tables = useJubyStore((state) => state.tables);
  const settings = useJubyStore((state) => state.settings);
  const endGame = useJubyStore((state) => state.endGame);

  const game = pendingAction?.type === 'endGame' ? games.find(g => String(g.id) === String(pendingAction.gameId)) : null;

  const [scores, setScores] = useState(() => {
    if (!game) return {};
    const initialScores = {};
    game.players.forEach(pid => {
      initialScores[pid] = 0;
    });
    return initialScores;
  });

  const [winnerId, setWinnerId] = useState(null);
  const [manualDiscount, setManualDiscount] = useState(() => game ? (game.manualDiscount || 0) : 0);
  const [discountReason, setDiscountReason] = useState(() => game ? (game.discountReason || '') : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setTick] = useState(0);

  // Live timer tick
  useEffect(() => {
    let intervalId = null;
    if (game) {
      intervalId = setInterval(() => {
        setTick(tick => tick + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [game]);

  if (!game) return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleEnd = () => {
    setIsSubmitting(true);
    const scoreMap = game.type === '8ball' && game.players.length === 2 ? scores : null;
    const res = endGame(game.id, winnerId, scoreMap, parseFloat(manualDiscount) || 0, discountReason);
    setIsSubmitting(false);

    if (res.success) {
      setPendingAction(null);
    }
  };

  // Construct temp game for live cost preview
  const tempGame = {
    ...game,
    jetons: game.type === '8ball' && game.players.length === 2 ? ((scores[game.players[0]] || 0) + (scores[game.players[1]] || 0)) : game.jetons,
    manualDiscount: parseFloat(manualDiscount) || 0
  };

  const currentCost = computeGameCost(tempGame, settings, tables);
  const currentCharges = computeCharges(tempGame, winnerId, settings, tables, players);
  const autoDisc = gameDiscount(tempGame, settings);
  const rawCost = game.type === '8ball' ? compute8BallRaw(tempGame, settings) : computeGameCost({ ...tempGame, manualDiscount: 0 }, settings, tables);

  const unitLbl = game.type === '8ball' ? 'Jetons' : game.type === 'snooker' ? 'Match' : '🎮 PS';
  const unitVal = game.type === '8ball' ? tempGame.jetons : '1';

  const adjustScore = (pid, amount) => {
    setScores(prev => {
      const newScore = Math.max(0, (prev[pid] || 0) + amount);
      const updated = { ...prev, [pid]: newScore };

      if (game.type === '8ball' && game.players.length === 2) {
        const [p1, p2] = game.players;
        const s1 = updated[p1] || 0;
        const s2 = updated[p2] || 0;
        if (s1 === s2) {
          setWinnerId(null);
        } else {
          setWinnerId(s1 > s2 ? p1 : p2);
        }
      }
      return updated;
    });
  };

  let winnerSection;
  if (game.type === '8ball') {
    if (game.players.length === 2) {
      winnerSection = (
        <div className="field">
          <label>🎯 {t('final_score')} <span className="muted">({t('score_hint')})</span></label>
          <div id="scoreInputs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {game.players.map(pid => {
              const p = players.find(x => x.id === pid);
              const sc = scores[pid] || 0;
              return (
                <div key={pid} style={{ background: 'var(--bg-3)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px' }}>{fullName(p)}</div>
                  <div className="row gap-sm" style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <button type="button" className="btn btn-sm" style={{ width: '36px', padding: '6px' }} onClick={() => adjustScore(pid, -1)}>−</button>
                    <input
                      type="number"
                      min="0"
                      value={sc}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setScores(prev => ({ ...prev, [pid]: val }));
                      }}
                      style={{ width: '70px', textAlign: 'center', fontSize: '28px', fontWeight: '800', color: 'var(--accent)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', minHeight: '52px' }}
                    />
                    <button type="button" className="btn btn-sm" style={{ width: '36px', padding: '6px' }} onClick={() => adjustScore(pid, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      winnerSection = <div className="muted">💡 {t('loser_pays_info')}</div>;
    }
  } else {
    // PlayStation or Snooker: pick loser manually
    if (game.players.length === 2) {
      winnerSection = (
        <div className="field">
          <label>💸 {t('loser_q')}</label>
          <div className="options-grid">
            {game.players.map(pid => {
              const p = players.find(x => x.id === pid);
              const otherId = game.players.find(x => x !== pid);
              const isSelectedLoser = winnerId && otherId === winnerId;
              return (
                <button
                  key={pid}
                  type="button"
                  className={`option-btn winner-opt ${isSelectedLoser ? 'selected' : ''}`}
                  onClick={() => setWinnerId(otherId)}
                >
                  {fullName(p)}
                </button>
              );
            })}
            <button
              type="button"
              className={`option-btn winner-opt ${winnerId === null ? 'selected' : ''}`}
              onClick={() => setWinnerId(null)}
            >
              {t('no_winner')}
            </button>
          </div>
        </div>
      );
    } else {
      winnerSection = <div className="muted">💡 {t('loser_pays_info')}</div>;
    }
  }

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('end_game_title')}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="profile-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            <div className="profile-stat">
              <div className="lbl">{unitLbl}</div>
              <div className="val">{unitVal}</div>
            </div>
            {autoDisc > 0 && (
              <>
                <div className="profile-stat">
                  <div className="lbl">{t('original_cost')}</div>
                  <div className="val" style={{ textDecoration: 'line-through', color: 'var(--text-faint)' }}>{fmt(rawCost)}dh</div>
                </div>
                <div className="profile-stat" style={{ background: 'rgba(46,204,113,0.1)' }}>
                  <div className="lbl">🎁 {t('discount')}</div>
                  <div className="val" style={{ color: 'var(--green)' }}>-{fmt(autoDisc)}dh</div>
                </div>
              </>
            )}
            <div className="profile-stat gold">
              <div className="lbl">{t('final_cost')}</div>
              <div className="val">{fmt(currentCost)}dh</div>
            </div>
            <div className="profile-stat">
              <div className="lbl">{t('duration')}</div>
              <div className="val">{durationStr(game.startTime)}</div>
            </div>
          </div>

          {winnerSection}

          <div className="field" style={{ marginTop: '12px' }}>
            <label>🎁 {t('manual_discount')} <span className="muted">({t('optional') || 'optionnel'})</span></label>
            <div className="row gap-sm" style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="0"
                value={manualDiscount}
                onChange={(e) => setManualDiscount(e.target.value)}
                placeholder="0 dh"
              />
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Raison..."
              />
            </div>
          </div>

          <div className="cost-breakdown-box" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginTop: '14px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>💳 Charges des joueurs:</div>
            {game.players.map(pid => {
              const p = players.find(x => x.id === pid);
              const charge = currentCharges[pid] || 0;
              const isStaff = isStaffClient(p);
              return (
                <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                  <span>{fullName(p)} {isStaff ? '(Staff)' : ''}:</span>
                  <b style={{ color: charge > 0 ? 'var(--accent)' : 'var(--green)' }}>
                    {charge > 0 ? `${fmt(charge)} dh` : 'Gratuit (0 dh)'}
                  </b>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-danger" onClick={handleEnd} disabled={isSubmitting}>
            🏁 {isSubmitting ? 'Fin en cours...' : t('end_game_title')}
          </button>
        </div>
      </div>
    </div>
  );
}
