import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName, fmt, fmtTimestamp, fmtTimeOnly, durationStr } from '../../../core/utils/timeUtils.js';
import { computeGameCost, gameDiscount } from '../../../core/utils/costCalculator.js';
import { getGamePaidStatus } from '../../../core/utils/customerLedger.js';

export function PlayHistoryTab({ onEditGame }) {
  const { t, lang } = useTranslation();
  const currentUser = useJubyStore((state) => state.currentUser);
  const games = useJubyStore((state) => state.games);
  const players = useJubyStore((state) => state.players);
  const tables = useJubyStore((state) => state.tables);
  const settings = useJubyStore((state) => state.settings);
  const payments = useJubyStore((state) => state.payments);
  const staffList = useJubyStore((state) => state.staff);

  const [tableFilter, setTableFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [hourFrom, setHourFrom] = useState('');
  const [hourTo, setHourTo] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // Filter games
  let filteredGames = games.filter(g => g.endTime);
  if (!isAdmin) {
    filteredGames = filteredGames.filter(g => g.staffId === currentUser.id);
  }
  if (tableFilter !== 'all') {
    filteredGames = filteredGames.filter(g => g.tableId === tableFilter);
  }
  if (dateFilter) {
    filteredGames = filteredGames.filter(g => {
      const d = new Date(g.startTime);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}` === dateFilter;
    });
  }
  if (monthFilter) {
    filteredGames = filteredGames.filter(g => {
      const d = new Date(g.startTime);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${yyyy}-${mm}` === monthFilter;
    });
  }
  if (hourFrom !== '') {
    filteredGames = filteredGames.filter(g => new Date(g.startTime).getHours() >= parseInt(hourFrom));
  }
  if (hourTo !== '') {
    filteredGames = filteredGames.filter(g => new Date(g.startTime).getHours() <= parseInt(hourTo));
  }

  // Sort newest first
  filteredGames.sort((a, b) => b.startTime - a.startTime);

  // KPIs
  const totalRevenue = filteredGames.reduce((s, g) => s + computeGameCost(g, settings, tables), 0);
  const totalDur = filteredGames.reduce((s, g) => s + ((g.endTime || g.startTime) - g.startTime), 0);

  const getPlayerObject = (id) => players.find(p => p.id === id);
  const getStaffName = (id) => staffList.find(s => s.id === id)?.name || id;

  const clearFilters = () => {
    setTableFilter('all');
    setDateFilter('');
    setMonthFilter('');
    setHourFrom('');
    setHourTo('');
  };

  return (
    <div className="section active">
      <div className="section-header">
        <h2>📊 {t('nav_playhistory')}</h2>
      </div>

      {/* Table Selector */}
      <div className="settings-section" style={{ padding: '16px', marginBottom: '14px' }}>
        <h3 style={{ marginBottom: '10px' }}>🎯 {t('select_table')}</h3>
        <div className="filter-bar" style={{ margin: 0, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`filter-pill ${tableFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTableFilter('all')}
          >
            🎯 {t('all_tables')}
          </button>
          {tables.map(tbl => (
            <button
              key={tbl.id}
              type="button"
              className={`filter-pill ${tableFilter === tbl.id ? 'active' : ''}`}
              onClick={() => setTableFilter(tbl.id)}
            >
              {tbl.type === 'snooker' ? '🎯' : '🎱'} {tbl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Filters */}
      <div className="settings-section" style={{ padding: '16px', marginBottom: '14px' }}>
        <h3 style={{ marginBottom: '10px' }}>📅 {t('filter_date')} / {t('filter_month')} / {t('filter_hour')}</h3>
        <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('filter_date')}</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('filter_month')}</label>
            <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('filter_hour')} {t('from')}</label>
            <input type="number" min="0" max="23" placeholder="0" value={hourFrom} onChange={(e) => setHourFrom(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('filter_hour')} {t('to')}</label>
            <input type="number" min="0" max="23" placeholder="23" value={hourTo} onChange={(e) => setHourTo(e.target.value)} />
          </div>
        </div>
        <button type="button" className="btn btn-sm mt-md" onClick={clearFilters} style={{ marginTop: '12px' }}>
          🗑️ {t('clear')}
        </button>
      </div>

      {/* KPI Display */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <div className="kpi-card gold">
          <div className="ico">🎮</div>
          <div className="lbl">{t('matches_found')}</div>
          <div className="val">{filteredGames.length}</div>
        </div>
        <div className="kpi-card green">
          <div className="ico">💰</div>
          <div className="lbl">{t('total_revenue_period')}</div>
          <div className="val">{fmt(totalRevenue)} dh</div>
        </div>
        <div className="kpi-card info">
          <div className="ico">⏱</div>
          <div className="lbl">{t('duration')}</div>
          <div className="val">{fmt(totalDur / 3600000)} h</div>
        </div>
      </div>

      {/* Games List */}
      {filteredGames.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📊</div>
          <p>{t('no_matches')}</p>
        </div>
      ) : (
        <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredGames.slice(0, 200).map(g => {
            const status = getGamePaidStatus(g.id, { games, payments });
            const playerNames = (g.players || []).map(pid => fullName(getPlayerObject(pid))).join(' & ');
            const cost = computeGameCost(g, settings, tables);
            const winner = g.winnerId ? fullName(getPlayerObject(g.winnerId)) : null;
            const scoreStr = g.score && g.type === '8ball' && (g.players || []).length === 2
              ? ` [${g.score[g.players[0]] || 0}-${g.score[g.players[1]] || 0}]`
              : '';
            const disc = gameDiscount(g, settings);
            const tbl = tables.find(x => x.id === g.tableId);

            return (
              <div key={g.id} className="history-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                <div className="left">
                  <div className="title" style={{ fontWeight: '700', fontSize: '14px' }}>
                    <span className="status-badge" style={{ background: 'rgba(212,175,55,0.18)', color: 'var(--accent)', marginRight: '8px', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                      {tbl ? tbl.label : g.tableId}
                    </span>
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
          })}
        </div>
      )}
    </div>
  );
}
