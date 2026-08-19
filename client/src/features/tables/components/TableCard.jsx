import { useState, useEffect } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { durationStr, fullName, initials, fmt } from '../../../core/utils/timeUtils.js';
import { computeGameCost } from '../../../core/utils/costCalculator.js';

export function TableCard({ table, onStartGame, onEndGame, onAddFrame, onManageQueue, onAddToQueue, onOpenTvPanel }) {
  const { t } = useTranslation();
  const settings = useJubyStore((state) => state.settings);
  const tables = useJubyStore((state) => state.tables);
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const activeShift = useJubyStore((state) => state.shifts.find(s => !s.endTime));

  const activeGame = games.find(g => g.tableId === table.id && !g.endTime);
  const isBusy = !!activeGame;

  // Local state to force re-render every second for active timer
  const [, setTick] = useState(0);

  useEffect(() => {
    let intervalId = null;
    if (isBusy) {
      intervalId = setInterval(() => {
        setTick(tick => tick + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isBusy]);

  const getTableIcon = () => {
    switch (table.type) {
      case 'snooker': return '🎯';
      case 'playstation': return '🎮';
      default: return '🎱';
    }
  };

  const getTableTypeLabel = () => {
    switch (table.type) {
      case 'snooker': return t('type_snooker');
      case 'playstation': return t('type_playstation');
      default: return t('type_8ball');
    }
  };

  const getPlayerObject = (id) => players.find(p => p.id === id);

  // Live Calculations
  const elapsed = isBusy ? durationStr(activeGame.startTime) : '';
  const currentCost = isBusy ? computeGameCost(activeGame, settings, tables) : 0;

  return (
    <div className={`table-card ${isBusy ? 'busy' : ''} ${isBusy && table.type === 'snooker' ? 'snooker' : ''}`}>
      <div className="table-head">
        <h3>
          <span>{getTableIcon()}</span>
          <span>{table.label}</span>
        </h3>
        <span className={`status-badge ${isBusy ? 'busy' : 'free'}`}>
          {isBusy ? t('busy') : t('free')}
        </span>
      </div>

      {table.type === 'snooker' && onOpenTvPanel && (
        <button
          type="button"
          className="btn btn-sm btn-block"
          onClick={() => onOpenTvPanel(table.id)}
          style={{ marginBottom: '8px', background: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.2)' }}
          title="TV Display"
        >
          📺 TV Display
        </button>
      )}

      <div className="table-body">
        {isBusy ? (
          <>
            <div className="players-row" style={{ marginBottom: '8px' }}>
              {(activeGame.players || []).map(pid => {
                const p = getPlayerObject(pid);
                if (!p) return null;
                return (
                  <div key={pid} className="mini-player">
                    <div className="mini-avatar">
                      {p.photo ? <img src={p.photo} alt="" /> : initials(p)}
                    </div>
                    <span>{fullName(p)}</span>
                    {p.isStaff && <span className="staff-tag">👔 STAFF</span>}
                  </div>
                );
              })}
            </div>

            <div className="table-info-row">
              <span className="key">🕐 {t('started_at')}:</span>
              <span className="val">
                {activeGame.startTime ? new Date(activeGame.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
              </span>
            </div>

            {table.type === 'playstation' && (
              <div className="table-info-row">
                <span className="key">🎮 Billing:</span>
                <span className="val">
                  {table.billingMode === 'perGame' ? `${table.rate} dh (Game)` : `${table.rate} dh/Hour`}
                </span>
              </div>
            )}

            {activeGame.type === '8ball' && (
              <div className="table-info-row">
                <span className="key">🎱 {t('level')}:</span>
                <span className="val" style={{ color: 'var(--accent)' }}>{activeGame.level || '-'}</span>
              </div>
            )}

            {activeGame.type === 'snooker' && activeGame.frames > 0 && (
              <div className="table-info-row">
                <span className="key">📊 Frames:</span>
                <span className="val">{activeGame.frames}</span>
              </div>
            )}

            <div className="timer-display">{elapsed}</div>

            <div className="cost-display">
              <div className="lbl">
                {activeGame.type === '8ball' ? 'MAX (selon score)' : t('cost_total')}
              </div>
              <div className="num">{fmt(currentCost)} dh</div>
            </div>

            <div className="table-actions" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  style={{ flex: 1 }}
                  onClick={() => onEndGame(activeGame.id)}
                >
                  ⏹ {t('end_save')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-info" 
                  style={{ flex: 1 }}
                  onClick={() => onAddToQueue(table.id)}
                >
                  ➕ {t('add_to_queue')}
                </button>
              </div>
              {(table.type === 'snooker' || table.type === 'playstation') && (
                <button 
                  type="button" 
                  className="btn btn-sm btn-primary btn-block" 
                  onClick={() => onAddFrame(activeGame.id)}
                  title={t('add_frame')}
                >
                  ➕ {t('add_frame')}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="table-empty">
            <div className="ico">{getTableIcon()}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{getTableTypeLabel()}</div>
            
            {table.queue && table.queue.length > 0 && (
              <button 
                type="button" 
                className="btn btn-sm btn-block" 
                onClick={() => onManageQueue(table.id)}
                style={{ marginTop: '8px', background: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.2)' }}
              >
                👥 {table.queue.length} {t('queue_waiting') || 'en attente'}
              </button>
            )}

            <div className="table-actions" style={{ width: '100%', marginTop: 'auto' }}>
              <button 
                type="button" 
                className="btn btn-block btn-primary" 
                onClick={() => onStartGame(table.id)}
                disabled={!activeShift}
              >
                ▶️ {t('start')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
