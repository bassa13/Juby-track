import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { durationStr, fmt, fmtTimestamp, isToday, isThisWeek, isThisMonth } from '../../../core/utils/timeUtils.js';

export function ShiftsHistoryTab() {
  const { t, lang } = useTranslation();
  const currentUser = useJubyStore((state) => state.currentUser);
  const shifts = useJubyStore((state) => state.shifts);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const settings = useJubyStore((state) => state.settings);
  const tables = useJubyStore((state) => state.tables);
  const staffList = useJubyStore((state) => state.staff);

  const [period, setPeriod] = useState('today');
  const [expandedShiftId, setExpandedShiftId] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  const getShiftStats = (shift, nowTs) => {
    if (!shift) return null;
    const start = shift.startTime;
    const end = shift.endTime || nowTs;
    
    // Games started by this staff during shift window
    const shiftGames = games.filter(g =>
      g.staffId === shift.staffId &&
      g.startTime >= start && g.startTime <= end
    );

    let jetonsUsedGames = 0;
    let staffJetonsUsed = 0;
    let totalCharged = 0;
    
    shiftGames.forEach(g => {
      if (g.type === '8ball') jetonsUsedGames += g.jetons || 0;
      if (g.endTime) {
        totalCharged += Object.values(g.charges || {}).reduce((a, b) => a + b, 0);
        if (g.staffJetons) {
          staffJetonsUsed += Object.values(g.staffJetons).reduce((a, b) => a + b, 0) / (settings.jetonPrice || 5);
        }
      }
    });

    const fmTotal = (shift.fauxMises || []).reduce((s, f) => s + f.count, 0);
    
    // Payments collected during shift (by this staff)
    const shiftPayments = payments.filter(p =>
      p.staffId === shift.staffId &&
      p.date >= start && p.date <= end
    );
    const cashCollected = shiftPayments.reduce((s, p) => s + p.amount, 0);

    const addedJetons = (shift.jetonAdditions || []).reduce((s, a) => s + a.count, 0);
    const jetonsSold = (shift.jetonSales || []).reduce((s, sale) => s + sale.count, 0);
    const totalJetons = shift.startingJetons + addedJetons;
    const jetonsRemaining = totalJetons - jetonsUsedGames - fmTotal - jetonsSold;
    const creditCreated = totalCharged - cashCollected;

    return {
      startingJetons: shift.startingJetons,
      startingCash: shift.startingCash,
      addedJetons,
      totalJetons,
      jetonsUsedGames,
      staffJetonsUsed,
      fmTotal,
      jetonsSold,
      jetonsRemaining,
      fauxMises: shift.fauxMises || [],
      games: shiftGames,
      payments: shiftPayments,
      cashCollected,
      totalCharged,
      creditCreated,
      duration: end - start
    };
  };

  const periodFilter = (ts) => {
    if (period === 'all') return true;
    if (period === 'today') return isToday(ts);
    if (period === 'week') return isThisWeek(ts);
    return isThisMonth(ts);
  };

  const closedShifts = shifts
    .filter(s => s.endTime && periodFilter(s.startTime))
    .sort((a, b) => b.startTime - a.startTime);

  const getStaffName = (sid) => staffList.find(s => s.id === sid)?.name || sid;
  const getTableName = (tid) => tables.find(t => t.id === tid)?.label || tid;

  const toggleExpand = (shiftId) => {
    setExpandedShiftId(prev => prev === shiftId ? null : shiftId);
  };

  if (!isAdmin) return null;

  return (
    <div className="section active">
      <div className="section-header">
        <h2>📋 {t('shift_history') || 'Historique Shifts'}</h2>
      </div>

      {/* Period Filter Selector */}
      <div className="settings-section" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '10px' }}>📅 Période</h3>
        <select value={period} id="shiftsPeriod" onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">{t('period_today') || "Aujourd'hui"}</option>
          <option value="week">{t('period_week') || "Cette semaine"}</option>
          <option value="month">{t('period_month') || "Ce mois"}</option>
          <option value="all">{t('period_all') || "Toutes"}</option>
        </select>
      </div>

      {/* Shifts List */}
      <div id="shiftsBody">
        {closedShifts.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--bg-2)', borderRadius: '12px', marginTop: '20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>Aucun shift fermé pour cette période</div>
            <div style={{ fontSize: '14px', color: 'var(--text-dim)', maxWidth: '400px', margin: '0 auto' }}>
              Les shifts fermés apparaîtront ici. Changez le filtre de période ci-dessus pour voir plus de résultats.
            </div>
          </div>
        ) : (
          closedShifts.map(shift => {
            const staffName = getStaffName(shift.staffId);
            const stats = getShiftStats(shift, shift.endTime || shift.startTime);
            const duration = durationStr(shift.startTime, shift.endTime);
            const cashDiff = shift.cashDiff || 0;
            const cashStatus = cashDiff === 0 ? '✅' : cashDiff > 0 ? '💰' : '⚠️';
            const isExpanded = expandedShiftId === shift.id;

            return (
              <div key={shift.id} className="player-card" style={{ marginBottom: '16px', border: '1px solid var(--border)' }}>
                <div className="player-header" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => toggleExpand(shift.id)}>
                  <div className="player-avatar" style={{ background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                    {staffName[0].toUpperCase()}
                  </div>
                  <div className="player-info" style={{ flex: 1, marginLeft: '12px' }}>
                    <div className="player-name">{staffName}</div>
                    <div className="muted" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      🕐 {fmtTimestamp(shift.startTime, lang)} → {fmtTimestamp(shift.endTime, lang)} ({duration})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--green)' }}>{fmt(stats.cashCollected)} dh</div>
                    <div className="muted" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{cashStatus} Diff: {fmt(cashDiff)} dh</div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px', background: 'var(--bg-2)', borderRadius: '8px', marginTop: '12px' }}>
                    <div className="settings-section" style={{ marginBottom: '12px' }}>
                      <h4 style={{ color: 'var(--accent)', fontSize: '14px', marginBottom: '8px' }}>💵 Cash</h4>
                      <div className="profile-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                        <div className="profile-stat"><div className="lbl">Attendu</div><div className="val">{fmt(stats.cashCollected)} dh</div></div>
                        <div className="profile-stat"><div className="lbl">Réel (Drawer)</div><div className="val">{fmt(shift.cashCount || 0)} dh</div></div>
                        <div className={`profile-stat ${cashDiff !== 0 ? 'debt' : 'win'}`}><div className="lbl">Différence</div><div className="val">{fmt(cashDiff)} dh {cashStatus}</div></div>
                        <div className="profile-stat"><div className="lbl">Crédit ouvert</div><div className="val">{fmt(stats.creditCreated)} dh</div></div>
                      </div>
                    </div>

                    <div className="settings-section" style={{ marginBottom: '12px' }}>
                      <h4 style={{ color: 'var(--accent)', fontSize: '14px', marginBottom: '8px' }}>🪙 Jetons</h4>
                      <div className="profile-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                        <div className="profile-stat"><div className="lbl">Départ</div><div className="val">{stats.startingJetons}</div></div>
                        <div className="profile-stat win"><div className="lbl">+ Ajoutés</div><div className="val">{stats.addedJetons}</div></div>
                        <div className="profile-stat spent"><div className="lbl">- Utilisés</div><div className="val">{stats.jetonsUsedGames}</div></div>
                        {stats.staffJetonsUsed > 0 && (
                          <div className="profile-stat" style={{ background: 'rgba(155,89,182,0.12)', border: '1px solid var(--purple)' }}>
                            <div className="lbl">👔 Staff</div>
                            <div className="val" style={{ color: 'var(--purple)' }}>{Math.round(stats.staffJetonsUsed)}</div>
                          </div>
                        )}
                        <div className="profile-stat debt"><div className="lbl">- Perdus</div><div className="val">{stats.fmTotal}</div></div>
                        <div className="profile-stat win"><div className="lbl">= Restant</div><div className="val">{stats.jetonsRemaining}</div></div>
                      </div>
                    </div>

                    <div className="settings-section">
                      <h4 style={{ color: 'var(--accent)', fontSize: '14px', marginBottom: '8px' }}>📊 Activité</h4>
                      <div className="muted" style={{ fontSize: '12px' }}>🎱 Parties: <strong>{stats.games.length}</strong></div>
                      <div className="muted" style={{ fontSize: '12px' }}>💵 Paiements: <strong>{stats.payments.length}</strong></div>
                      <div className="muted" style={{ fontSize: '12px' }}>⏳ Durée: <strong>{duration}</strong></div>
                      
                      {stats.fauxMises.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(231,76,60,0.1)', border: '1px solid var(--red)', borderRadius: '8px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--red)', marginBottom: '8px', fontSize: '12px' }}>⚠️ Jetons Perdus:</div>
                          {stats.fauxMises.map(f => (
                            <div key={f.id} className="muted" style={{ fontSize: '11px' }}>
                              • {getTableName(f.tableId)}: {f.count} ({f.reason || 'N/A'}{f.note ? ` - ${f.note}` : ''})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
