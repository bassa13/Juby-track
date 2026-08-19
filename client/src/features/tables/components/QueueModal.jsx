import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName, initials } from '../../../core/utils/timeUtils.js';
import { getPlayerStats } from '../../../core/utils/customerLedger.js';

export function QueueModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const tables = useJubyStore((state) => state.tables);
  const settings = useJubyStore((state) => state.settings);

  const addToQueue = useJubyStore((state) => state.addToQueue);
  const removeFromQueue = useJubyStore((state) => state.removeFromQueue);
  const clearQueue = useJubyStore((state) => state.clearQueue);
  const startGame = useJubyStore((state) => state.startGame);

  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [level, setLevel] = useState('A3');
  const [error, setError] = useState('');

  const isAddMode = pendingAction?.type === 'addToQueue';
  const isManageMode = pendingAction?.type === 'manageQueue';

  const tableId = pendingAction?.tableId;
  const table = tableId ? tables.find(t => String(t.id) === String(tableId)) : null;

  if (!table || (!isAddMode && !isManageMode)) return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleAddConfirm = () => {
    setError('');
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

    addToQueue(table.id, player1, player2, table.type === '8ball' ? level : null);
    setPendingAction(null);
  };

  const handleStartQueued = (entry) => {
    const res = startGame(table.id, entry.p1, entry.p2, entry.level);
    if (res.success) {
      removeFromQueue(table.id, entry.id);
      setPendingAction(null);
    } else {
      setError(t(res.error));
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Vider toute la queue?')) {
      clearQueue(table.id);
      setPendingAction(null);
    }
  };

  const sortedPlayers = [...players].sort((a, b) => fullName(a).localeCompare(fullName(b)));

  if (isAddMode) {
    return (
      <div className="modal-overlay open" onClick={handleClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>👥 {t('add_to_queue')} - {table.label}</h3>
            <button type="button" className="modal-close" onClick={handleClose}>×</button>
          </div>

          <div className="modal-body">
            {error && <div className="login-error" style={{ marginBottom: '12px' }}>{error}</div>}

            {table.type === '8ball' && (
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
                      <span className="sub">max {v} jetons</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
          </div>

          <div className="modal-foot">
            <button type="button" className="btn" onClick={handleClose}>{t('cancel')}</button>
            <button type="button" className="btn btn-primary" onClick={handleAddConfirm}>
              {t('add_to_queue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Manage Mode
  const activeGame = games.find(g => g.tableId === table.id && !g.endTime);
  const isTableFree = !activeGame;

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>👥 {t('queue')} - {table.label}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="login-error" style={{ marginBottom: '12px' }}>{error}</div>}

          <div style={{ marginBottom: '14px' }}>
            <b>{(table.queue || []).length} client(s) en attente</b>
          </div>

          <div id="queueManagerList">
            {(table.queue || []).map((entry, idx) => {
              const p1 = players.find(x => x.id === entry.p1);
              const p2 = entry.p2 ? players.find(x => x.id === entry.p2) : null;
              
              const labelText = p2 ? `${fullName(p1)} vs ${fullName(p2)}` : fullName(p1);
              const levelTag = entry.level ? ` (${entry.level})` : '';

              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-3)', borderRadius: '8px', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '16px', minWidth: '24px' }}>{idx + 1}.</span>
                  <div style={{ flex: 1, fontWeight: '600' }}>
                    {labelText}{levelTag}
                  </div>
                  {isTableFree && idx === 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => handleStartQueued(entry)}
                      style={{ marginRight: '6px' }}
                    >
                      ▶️ Start
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeFromQueue(table.id, entry.id)}
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>

          <div className="row gap-sm mt-md" style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button type="button" className="btn btn-warning btn-block" onClick={handleClearAll}>
              🗑️ Clear All
            </button>
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>✕ Fermer</button>
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
                        <span style={{ color: 'var(--warning)', fontSize: '11px', marginLeft: '6px' }}>{getPlayerStats(p.id, { players, games, payments }).balance}dh</span>
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
