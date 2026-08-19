import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { getPlayerStats } from '../../../core/utils/customerLedger.js';
import { fullName, initials, fmt, isBirthdayToday, hoursUntilBirthday } from '../../../core/utils/timeUtils.js';

export function PlayersTab({ onOpenProfile, onOpenPay, onOpenSMS, onAddPlayer }) {
  const { t, lang } = useTranslation();
  
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const currentUser = useJubyStore((state) => state.currentUser);
  const ui = useJubyStore((state) => state.ui);
  const setUIFilter = useJubyStore((state) => state.setUIFilter);

  const [search, setSearch] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const staffFilter = isAdmin ? null : currentUser?.id;

  // Filter & process players
  const filter = ui.playerFilter || 'all';

  const processedPlayers = players
    .map(p => {
      const stats = getPlayerStats(p.id, { players, games, payments }, staffFilter);
      return { ...p, stats };
    })
    .filter(p => {
      // 1. Search Query filter
      const nameMatch = fullName(p).toLowerCase().includes(search.toLowerCase());
      const phoneMatch = (p.phone || '').includes(search);
      if (search && !nameMatch && !phoneMatch) return false;

      // 2. Staff relation filter (Staff only sees their own clients)
      if (!isAdmin && p.stats.gamesPlayed === 0 && p.stats.totalPaid === 0) return false;

      // 3. Tab filter
      if (filter === 'debt') return p.stats.balance > 0;
      if (filter === 'paid') return p.stats.balance <= 0 && p.stats.gamesPlayed > 0;
      if (filter === 'staff') return p.isStaff;

      return true;
    })
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  return (
    <div className="section active">
      {/* Header */}
      <div className="section-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          👥 <span>{t('nav_players')}</span>
          <span className="status-badge" style={{ 
            background: isAdmin ? 'rgba(212,175,55,0.18)' : 'rgba(52,152,219,0.18)', 
            color: isAdmin ? 'var(--accent)' : 'var(--info)',
            fontSize: '10px',
            marginLeft: lang === 'ar' ? '0' : '8px',
            marginRight: lang === 'ar' ? '8px' : '0'
          }}>
            {isAdmin ? t('admin_view') : t('only_my_clients')}
          </span>
        </h2>
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={onAddPlayer}
        >
          ➕ {t('add_player')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <input 
          type="search" 
          className="client-search-input" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_player')}
          style={{ flex: 1, minWidth: '240px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          autoComplete="off"
        />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setUIFilter('playerFilter', 'all')}
          >
            {t('all')}
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${filter === 'debt' ? 'btn-primary' : ''}`}
            onClick={() => setUIFilter('playerFilter', 'debt')}
          >
            {t('with_debt')}
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${filter === 'paid' ? 'btn-primary' : ''}`}
            onClick={() => setUIFilter('playerFilter', 'paid')}
          >
            {t('paid_up')}
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${filter === 'staff' ? 'btn-primary' : ''}`}
            onClick={() => setUIFilter('playerFilter', 'staff')}
          >
            {t('staff_clients')}
          </button>
        </div>
      </div>

      {/* Players List Table */}
      {processedPlayers.length === 0 ? (
        <div className="table-empty" style={{ padding: '60px 0' }}>
          <div className="ico">👥</div>
          <p>{t('no_data')}</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th className="hide-mobile">{t('phone')}</th>
                <th>{t('debt')}</th>
                <th className="hide-mobile">{t('games_count')}</th>
                <th className="hide-mobile">{t('winrate')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {processedPlayers.map((p) => {
                const isBdayToday = isBirthdayToday(p.birthdate);
                const hoursToBday = p.birthdate ? hoursUntilBirthday(p.birthdate) : Infinity;
                const bdayBadge = isBdayToday ? ' 🎉' : (hoursToBday <= 24 ? ' 🎂' : '');
                
                return (
                  <tr 
                    key={p.id} 
                    onClick={() => onOpenProfile(p.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="player-avatar sm" style={{ background: 'linear-gradient(135deg, var(--accent), var(--green))', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                          {p.photo ? <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(p)}
                        </div>
                        <div>
                          <strong>{fullName(p)}{bdayBadge}</strong>
                          {p.isStaff && (
                            <span className="client-staff-badge" style={{ marginLeft: '6px' }}>
                              👔 STAFF
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">
                      {p.phone || <span style={{ color: 'var(--text-faint)' }}>-</span>}
                    </td>
                    <td>
                      <span className={p.stats.balance > 0 ? 'balance-pos' : 'balance-zero'}>
                        {p.stats.balance > 0 
                          ? `${fmt(p.stats.balance)} dh` 
                          : p.stats.credit > 0 ? `💚 +${fmt(p.stats.credit)} dh` : '✓'}
                      </span>
                    </td>
                    <td className="hide-mobile">{p.stats.gamesPlayed}</td>
                    <td className="hide-mobile">
                      {p.stats.gamesPlayed ? (
                        <div className="win-rate-bar">
                          <span style={{ fontSize: '11px', minWidth: '32px' }}>
                            {Math.round(p.stats.winRate)}%
                          </span>
                          <div className="bar">
                            <div className="fill" style={{ width: `${p.stats.winRate}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-faint)' }}>-</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {p.stats.balance > 0 && (
                          <button 
                            type="button" 
                            className="btn btn-warning btn-sm" 
                            onClick={() => onOpenPay(p.id)}
                          >
                            💵 {t('pay_button')}
                          </button>
                        )}
                        {p.phone && (
                          <button 
                            type="button" 
                            className="btn btn-sm" 
                            onClick={() => onOpenSMS(p.id)}
                          >
                            💬 SMS
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
