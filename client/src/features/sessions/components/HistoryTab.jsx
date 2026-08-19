import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName, fmt, fmtDate, fmtTimestamp, fmtTimeOnly, durationStr, isToday } from '../../../core/utils/timeUtils.js';
import { computeGameCost, gameDiscount } from '../../../core/utils/costCalculator.js';
import { getGamePaidStatus } from '../../../core/utils/customerLedger.js';

export function HistoryTab({ onEditGame }) {
  const { t, lang } = useTranslation();
  const currentUser = useJubyStore((state) => state.currentUser);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const shifts = useJubyStore((state) => state.shifts);
  const players = useJubyStore((state) => state.players);
  const tables = useJubyStore((state) => state.tables);
  const settings = useJubyStore((state) => state.settings);
  const staffList = useJubyStore((state) => state.staff);

  const [filter, setFilter] = useState('all');

  const isAdmin = currentUser?.role === 'admin';

  // Aggregate items
  let items = [];

  // 1. Ended Games
  games.filter(g => g.endTime).forEach(g => {
    items.push({ kind: 'game', date: g.endTime, data: g });
  });

  // 2. Payments
  payments.forEach(p => {
    items.push({ kind: 'payment', date: p.date, data: p });
  });

  // 3. Jeton Sales & Faux Mises from Shifts
  shifts.forEach(shift => {
    if (shift.jetonSales) {
      shift.jetonSales.forEach(sale => {
        items.push({
          kind: 'jetonsale',
          date: sale.time,
          data: { ...sale, staffId: shift.staffId }
        });
      });
    }
    if (shift.fauxMises) {
      shift.fauxMises.forEach(fm => {
        items.push({
          kind: 'lostjeton',
          date: fm.time,
          data: { ...fm, staffId: shift.staffId }
        });
      });
    }
  });

  // Sort by date descending
  items.sort((a, b) => b.date - a.date);

  // Apply filters
  if (filter === 'games') {
    items = items.filter(i => i.kind === 'game');
  } else if (filter === 'payments') {
    items = items.filter(i => i.kind === 'payment');
  } else if (filter === 'today') {
    items = items.filter(i => isToday(i.date));
  }

  const getPlayerObject = (id) => players.find(p => p.id === id);
  const getStaffName = (id) => staffList.find(s => s.id === id)?.name || id;

  return (
    <div className="section active">
      <div className="section-header">
        <h2>📜 {t('nav_history')}</h2>
      </div>

      {/* Filter pills */}
      <div className="settings-section" style={{ padding: '16px', marginBottom: '14px' }}>
        <div className="filter-bar" style={{ margin: 0, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            📜 {t('all')}
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'games' ? 'active' : ''}`}
            onClick={() => setFilter('games')}
          >
            🎱 {t('games')}
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'payments' ? 'active' : ''}`}
            onClick={() => setFilter('payments')}
          >
            💵 {t('payments')}
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'today' ? 'active' : ''}`}
            onClick={() => setFilter('today')}
          >
            📅 {t('today')}
          </button>
        </div>
      </div>

      {/* History Items list */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📜</div>
          <p>{t('no_data')}</p>
        </div>
      ) : (
        <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.slice(0, 200).map((it, index) => {
            const keyId = `${it.kind}-${it.date}-${index}`;

            if (it.kind === 'game') {
              const g = it.data;
              const status = getGamePaidStatus(g.id, { games, payments, settings, tables });
              const playerNames = (g.players || []).map(pid => fullName(getPlayerObject(pid))).join(' & ');
              const cost = computeGameCost(g, settings, tables);
              const winner = g.winnerId ? fullName(getPlayerObject(g.winnerId)) : null;
              const scoreStr = g.score && g.type === '8ball' && (g.players || []).length === 2
                ? ` [${g.score[g.players[0]] || 0}-${g.score[g.players[1]] || 0}]`
                : '';
              const disc = gameDiscount(g, settings);

              return (
                <div key={keyId} className="history-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div className="left">
                    <div className="title" style={{ fontWeight: '700', fontSize: '14px' }}>
                      {g.type === '8ball' ? `🎱 ${g.level} (${g.jetons}j)` : `🎯 Snooker`}{scoreStr}
                    </div>
                    <div className="meta" style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      <span>{playerNames}</span>
                      {winner && <span> · 🏆 {winner}</span>}
                      <span> · {t('by_staff')} {getStaffName(g.staffId)}</span>
                      {disc > 0 && <span style={{ color: 'var(--green)' }}> · 🎁 -{fmt(disc)}dh</span>}
                    </div>
                    <div className="meta" style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                      <span>🕐 {fmtTimestamp(g.startTime, lang)}</span>
                      <span> → {fmtTimeOnly(g.endTime, lang)}</span>
                      <span style={{ color: 'var(--green)', marginLeft: '6px' }}>⏱ {durationStr(g.startTime, g.endTime)}</span>
                    </div>
                  </div>
                  <div className="right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className={`amount ${status.status === 'unpaid' ? 'unpaid' : ''}`} style={{ fontWeight: '700', fontSize: '16px' }}>
                      {fmt(cost)}dh
                    </span>
                    <span className={`pay-status ${status.status}`}>
                      {t(status.status)}
                      {status.status === 'partial' ? ` ${fmt(status.paid)}/${fmt(status.total)}` : ''}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onEditGame(g.id)}
                        style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(212,175,55,0.12)', color: 'var(--accent)', border: '1px solid var(--accent-dim)', borderRadius: '6px', marginTop: '4px' }}
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              );
            } else if (it.kind === 'jetonsale') {
              const sale = it.data;
              return (
                <div key={keyId} className="history-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div className="left">
                    <div className="title" style={{ fontWeight: '700', fontSize: '14px' }}>💰 Vente de jetons</div>
                    <div className="meta" style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      <span>{fmtDate(sale.time, lang)}</span>
                      <span> · {t('by_staff')} {getStaffName(sale.staffId)}</span>
                      <span> · {sale.count} jetons @ {settings.jetonPrice || 5}dh</span>
                    </div>
                  </div>
                  <div className="right">
                    <span className="amount pay" style={{ fontWeight: '700', fontSize: '16px', color: 'var(--green)' }}>+{fmt(sale.amount)}dh</span>
                    <span className="pay-status" style={{ background: 'rgba(46,204,113,0.12)', color: 'var(--green)' }}>SALE</span>
                  </div>
                </div>
              );
            } else if (it.kind === 'lostjeton') {
              const fm = it.data;
              const table = tables.find(t => t.id === fm.tableId);
              const reasons = { misshot: 'Faux coup', machine: 'Machine', other: 'Autre' };
              return (
                <div key={keyId} className="history-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div className="left">
                    <div className="title" style={{ fontWeight: '700', fontSize: '14px' }}>⚠️ Jeton perdu · {table ? table.label : fm.tableId}</div>
                    <div className="meta" style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      <span>{fmtDate(fm.time, lang)}</span>
                      <span> · {t('by_staff')} {getStaffName(fm.staffId)}</span>
                      <span> · {reasons[fm.reason] || fm.reason}</span>
                      {fm.note && <span> · {fm.note}</span>}
                    </div>
                  </div>
                  <div className="right">
                    <span className="amount" style={{ fontWeight: '700', fontSize: '16px', color: 'var(--danger)' }}>-{fm.count} jeton{fm.count > 1 ? 's' : ''}</span>
                    <span className="pay-status" style={{ background: 'rgba(231,76,60,0.12)', color: 'var(--danger)' }}>LOST</span>
                  </div>
                </div>
              );
            } else {
              // Payment
              const p = it.data;
              const player = p.playerId ? getPlayerObject(p.playerId) : null;
              const displayName = p.isJetonSale && !player ? '💰 Vente jetons' : (player ? fullName(player) : 'Client Supprimé');

              return (
                <div key={keyId} className="history-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div className="left">
                    <div className="title" style={{ fontWeight: '700', fontSize: '14px' }}>💵 {t('payments')} · {displayName}</div>
                    <div className="meta" style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      <span>{fmtDate(p.date, lang)}</span>
                      <span> · {t('by_staff')} {getStaffName(p.staffId)}</span>
                      {p.note && <span> · {p.note}</span>}
                    </div>
                  </div>
                  <div className="right">
                    <span className="amount pay" style={{ fontWeight: '700', fontSize: '16px', color: 'var(--green)' }}>+{fmt(p.amount)}dh</span>
                    <span className="pay-status payment">PAY</span>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
