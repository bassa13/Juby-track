import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName, initials, fmt } from '../../../core/utils/timeUtils.js';
import { getPlayerStats } from '../../../core/utils/customerLedger.js';

export function StartGameModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const settings = useJubyStore((state) => state.settings);
  const tables = useJubyStore((state) => state.tables);
  const startGame = useJubyStore((state) => state.startGame);

  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [level, setLevel] = useState('A3');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pendingAction || pendingAction.type !== 'startGame') return null;

  const tableId = pendingAction.tableId;
  const table = tables.find(t => String(t.id) === String(tableId));
  if (!table) return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleStart = async () => {
    setError('');

    if (table.type === '8ball' && !level) {
      setError('⚠️ Khtar level!');
      return;
    }
    if (!player1) {
      setError('⚠️ Khtar Player 1!');
      return;
    }
    if (table.type === 'snooker' && !player2) {
      setError('⚠️ Khtar Player 2!');
      return;
    }
    if (player2 && player2 === player1) {
      setError(t('err_same_player'));
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const res = startGame(tableId, player1, player2, level);
      if (res && res.success) {
        setPendingAction(null);
      } else {
        setError(t(res?.error || 'err_unknown'));
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err?.message || 'Error');
      setIsSubmitting(false);
    }
  };

  // Levels for 8-ball
  let levelsHTML = null;
  if (table.type === '8ball') {
    levelsHTML = (
      <div className="field">
        <label>{t('level')} <span className="muted">(max jetons)</span></label>
        <div className="options-grid">
          {Object.entries(settings.levels || {}).map(([k, v]) => (
            <button
              key={k}
              type="button"
              className={`option-btn ${level === k ? 'selected' : ''}`}
              onClick={() => setLevel(k)}
            >
              {k}
              <span className="sub">max {v} jetons · {v * settings.jetonPrice} dh</span>
            </button>
          ))}
        </div>
        <div className="muted mt-sm" style={{ fontSize: '11px' }}>
          💡 {t('jetons_from_score_hint')}
        </div>
      </div>
    );
  } else if (table.type === 'snooker') {
    // Determine snooker rate
    const h = new Date().getHours();
    const ds = settings.snookerDayStart ?? 8;
    const de = settings.snookerDayEnd ?? 16;
    const isDay = h >= ds && h < de;
    const rate = isDay ? settings.snookerDayRate : settings.snookerNightRate;

    levelsHTML = (
      <div className="cost-display" style={{ marginBottom: '14px' }}>
        <div className="lbl">{isDay ? '☀️ ' + t('snooker_day') : '🌙 ' + t('snooker_night')} · 1 match</div>
        <div className="num">{rate} dh</div>
        <div className="muted" style={{ marginTop: '6px' }}>
          {t('snooker_day')} ({settings.snookerDayStart}h-{settings.snookerDayEnd}h): {settings.snookerDayRate}dh · {t('snooker_night')}: {settings.snookerNightRate}dh
        </div>
      </div>
    );
  } else if (table.type === 'playstation') {
    const unit = table.billingMode === 'perGame' ? '/ partie' : '/ heure';
    levelsHTML = (
      <div className="cost-display" style={{ marginBottom: '14px' }}>
        <div className="lbl">🎮 PlayStation · {table.billingMode === 'perGame' ? t('ps_per_game') : t('ps_per_hour')}</div>
        <div className="num">{table.rate || 0} dh {unit}</div>
      </div>
    );
  }

  const sortedPlayers = [...players].sort((a, b) => fullName(a).localeCompare(fullName(b)));

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('start')} - {table.label}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="login-error" style={{ marginBottom: '12px' }}>
              {error}
            </div>
          )}

          {sortedPlayers.length === 0 ? (
            <div className="empty-state">
              <div className="icon">😕</div>
              <p>{t('no_player_yet')}</p>
              <button
                type="button"
                className="btn btn-primary mt-md"
                onClick={() => {
                  // Direct to adding a player
                  setPendingAction({ type: 'addPlayer', isSubmitting: false });
                }}
              >
                + {t('add_player')}
              </button>
            </div>
          ) : (
            <>
              {levelsHTML}

              <PlayerDropdownPicker
                label={t('player1')}
                selectedPlayerId={player1}
                onSelect={setPlayer1}
                players={sortedPlayers}
                games={games}
                payments={payments}
                t={t}
                otherPlayerId={player2}
              />

              <PlayerDropdownPicker
                label={`${t('player2')} (${t('optional') || 'optionnel'})`}
                selectedPlayerId={player2}
                onSelect={setPlayer2}
                players={sortedPlayers}
                games={games}
                payments={payments}
                t={t}
                otherPlayerId={player1}
              />

              <div className="muted" style={{ background: 'rgba(212,175,55,0.08)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid var(--accent)', fontSize: '12px', marginTop: '12px' }}>
                💡 {t('loser_pays_info')}
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStart}
            disabled={isSubmitting || sortedPlayers.length === 0}
          >
            {isSubmitting ? '⏳ Starting...' : t('start')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerDropdownPicker({ label, selectedPlayerId, onSelect, players, games, payments, t, otherPlayerId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  const filteredPlayers = players.filter(p => {
    const fullNameStr = ((p.name || '') + ' ' + (p.lastname || '')).toLowerCase();
    return fullNameStr.includes(search.toLowerCase()) && p.id !== otherPlayerId;
  });

  return (
    <div className="field">
      <label>{label}</label>
      <div className="player-picker">
        <div className="picker-selected" onClick={() => setIsOpen(!isOpen)}>
          {selectedPlayer ? (
            <span className="picker-value">
              {selectedPlayer.photo ? (
                <img src={selectedPlayer.photo} className="player-avatar sm" style={{ marginRight: '8px', verticalAlign: 'middle', width: '24px', height: '24px', borderRadius: '50%' }} alt="" />
              ) : (
                <span className="player-avatar sm" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-3)', textAlign: 'center', lineHeight: '24px', fontSize: '10px' }}>{initials(selectedPlayer)}</span>
              )}
              {fullName(selectedPlayer)}
            </span>
          ) : (
            <span className="picker-placeholder">{t('pick_player')}</span>
          )}
          <span className="picker-arrow">▾</span>
        </div>
        
        {isOpen && (
          <div className="picker-dropdown" style={{ display: 'block' }}>
            <input 
              type="text" 
              className="picker-search" 
              placeholder="🔍 Kteb smiya..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="picker-list">
              {filteredPlayers.length === 0 ? (
                <div className="muted" style={{ padding: '8px', textAlign: 'center' }}>Aucun client trouvé</div>
              ) : (
                filteredPlayers.map(p => {
                  const stats = getPlayerStats(p.id, { players, games, payments });
                  const hasDebt = stats.balance > 0;
                  return (
                    <div 
                      key={p.id} 
                      className="player-pick-item" 
                      onClick={() => {
                        onSelect(p.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                    >
                      {p.photo ? (
                        <div className="player-avatar sm"><img src={p.photo} alt="" /></div>
                      ) : (
                        <div className="player-avatar sm">{initials(p)}</div>
                      )}
                      <span style={{ flex: 1 }}>
                        {fullName(p)}
                        {p.isStaff && <span style={{ color: 'var(--purple)', fontSize: '10px', marginLeft: '4px' }}>👔</span>}
                      </span>
                      {hasDebt && (
                        <span style={{ color: 'var(--warning)', fontSize: '11px', marginLeft: '6px' }}>{fmt(stats.balance)}dh</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
