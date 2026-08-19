import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { getPlayerStats } from '../../../core/utils/customerLedger.js';
import { isToday, isThisWeek, isThisMonth, fullName, initials, fmt } from '../../../core/utils/timeUtils.js';

export function ReportsTab({ onOpenProfile }) {
  const { t } = useTranslation();
  
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const players = useJubyStore((state) => state.players);
  const staff = useJubyStore((state) => state.staff);
  const ui = useJubyStore((state) => state.ui);
  const setUIFilter = useJubyStore((state) => state.setUIFilter);

  const period = ui.reportPeriod || 'today';

  const filterFn = (ts) => {
    if (period === 'all') return true;
    if (period === 'today') return isToday(ts);
    if (period === 'week') return isThisWeek(ts);
    return isThisMonth(ts);
  };

  // Filter lists based on period selection
  const filteredGames = games.filter(g => g.endTime && filterFn(g.endTime));
  const filteredPayments = payments.filter(p => filterFn(p.date));

  // Compute aggregated stats
  const totalRev = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const totalCharged = filteredGames.reduce((s, g) => s + Object.values(g.charges || {}).reduce((a, b) => a + b, 0), 0);
  
  // Total debt balance (global, not per period as debt is running)
  const outstanding = players.reduce((s, p) => {
    const stats = getPlayerStats(p.id, { players, games, payments });
    return s + stats.balance;
  }, 0);

  const activeClients = new Set(filteredGames.flatMap(g => g.players || [])).size;

  // Staff Performance calculations
  const staffPerf = staff.map(s => {
    const handledGames = filteredGames.filter(g => g.staffId === s.id || g.endStaffId === s.id).length;
    const collected = filteredPayments.filter(p => p.staffId === s.id).reduce((sum, p) => sum + p.amount, 0);
    return { ...s, handledGames, collected };
  }).sort((a, b) => b.collected - a.collected);

  // Top Customer spenders
  const clientSpend = {};
  filteredGames.forEach(g => {
    Object.entries(g.charges || {}).forEach(([pid, amt]) => {
      clientSpend[pid] = (clientSpend[pid] || 0) + amt;
    });
  });

  const topClients = Object.entries(clientSpend)
    .map(([pid, amt]) => ({
      player: players.find(p => p.id === pid),
      amount: amt
    }))
    .filter(x => x.player)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return (
    <div className="section active">
      {/* Header with period picker */}
      <div className="section-header">
        <h2>📊 {t('nav_reports')}</h2>
        <select 
          className="lang-select" 
          value={period} 
          onChange={(e) => setUIFilter('reportPeriod', e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px' }}
        >
          <option value="today">{t('period_today')}</option>
          <option value="week">{t('period_week')}</option>
          <option value="month">{t('period_month')}</option>
          <option value="all">{t('period_all')}</option>
        </select>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="kpi-card gold">
          <div className="ico">💰</div>
          <div className="lbl">{t('revenue')}</div>
          <div className="val">{fmt(totalRev)} dh</div>
          <div className="delta">{filteredPayments.length} {t('payments')}</div>
        </div>
        <div className="kpi-card warn">
          <div className="ico">⚠️</div>
          <div className="lbl">{t('needed')}</div>
          <div className="val">{fmt(outstanding)} dh</div>
          <div className="delta">total dette</div>
        </div>
        <div className="kpi-card green">
          <div className="ico">🎱</div>
          <div className="lbl">{t('games_played')}</div>
          <div className="val">{filteredGames.length}</div>
          <div className="delta">{fmt(totalCharged)} dh facturé</div>
        </div>
        <div className="kpi-card info">
          <div className="ico">👥</div>
          <div className="lbl">{t('clients_count')}</div>
          <div className="val">{activeClients}</div>
          <div className="delta">actifs</div>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="settings-section" style={{ marginBottom: '22px' }}>
        <h3>👔 {t('staff_perf')}</h3>
        {staffPerf.length === 0 ? (
          <div className="muted">{t('no_data')}</div>
        ) : (
          <div className="data-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('role')}</th>
                  <th>{t('staff_games')}</th>
                  <th>{t('staff_revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {staffPerf.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{t(`role_${s.role}`)}</td>
                    <td>{s.handledGames}</td>
                    <td><strong style={{ color: 'var(--accent)' }}>{fmt(s.collected)} dh</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Customer Spenders */}
      <div className="settings-section">
        <h3>🏆 {t('top_clients')}</h3>
        {topClients.length === 0 ? (
          <div className="muted">{t('no_data')}</div>
        ) : (
          <div className="data-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('spent')}</th>
                  <th>{t('debt')}</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c) => {
                  const stats = getPlayerStats(c.player.id, { players, games, payments });
                  return (
                    <tr 
                      key={c.player.id} 
                      onClick={() => onOpenProfile(c.player.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="player-avatar sm" style={{ background: 'linear-gradient(135deg, var(--accent), var(--green))', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                            {c.player.photo ? <img src={c.player.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(c.player)}
                          </div>
                          <strong>{fullName(c.player)}</strong>
                        </div>
                      </td>
                      <td>{c.player.phone || '-'}</td>
                      <td><strong style={{ color: 'var(--accent)' }}>{fmt(c.amount)} dh</strong></td>
                      <td>
                        <span className={stats.balance > 0 ? 'balance-pos' : 'balance-zero'}>
                          {stats.balance > 0 ? `${fmt(stats.balance)} dh` : '✓'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
