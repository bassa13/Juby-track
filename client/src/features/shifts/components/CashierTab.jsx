import { useState, useEffect } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { durationStr, fmt, fmtDate, fmtTimestamp } from '../../../core/utils/timeUtils.js';

export function CashierTab({ 
  onOpenShift, 
  onCloseShift, 
  onAddJetons, 
  onSellJetons, 
  onAddFauxMise, 
  onRemoveFauxMise 
}) {
  const { t } = useTranslation();
  
  const currentUser = useJubyStore((state) => state.currentUser);
  const shifts = useJubyStore((state) => state.shifts);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const settings = useJubyStore((state) => state.settings);
  const tables = useJubyStore((state) => state.tables);
  const staffList = useJubyStore((state) => state.staff);

  const [startingCash, setStartingCash] = useState(0);
  const [startingJetons, setStartingJetons] = useState(settings.defaultStartingJetons || 200);
  const [isOpeningShift, setIsOpeningShift] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const activeShift = shifts.find(s => !s.endTime);

  // Live timer for active shift
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let intervalId = null;
    if (activeShift) {
      intervalId = setInterval(() => {
        setNow(Date.now());
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeShift]);

  // Helper: compute statistics for any shift
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
          staffJetonsUsed += Object.values(g.staffJetons).reduce((a, b) => a + b, 0) / settings.jetonPrice;
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

  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (isOpeningShift) return;
    setIsOpeningShift(true);
    try {
      await onOpenShift(startingJetons, startingCash);
    } finally {
      setIsOpeningShift(false);
    }
  };

  const getStaffName = (sid) => {
    const s = staffList.find(x => x.id === sid);
    return s ? s.name : sid;
  };

  const getTableName = (tid) => {
    const t = tables.find(x => x.id === tid);
    return t ? t.label : tid;
  };

  // ================= ADMIN VIEW =================
  if (isAdmin) {
    const activeShifts = shifts.filter(s => !s.endTime);
    const closedShifts = shifts.filter(s => s.endTime).sort((a, b) => b.startTime - a.startTime);

    // Todays stats aggregation
    const todayShifts = shifts.filter(s => {
      const startDay = new Date(s.startTime).toDateString();
      const endDay = s.endTime ? new Date(s.endTime).toDateString() : '';
      const today = new Date().toDateString();
      return startDay === today || endDay === today;
    });

    const aggregates = todayShifts.reduce((acc, s) => {
      const stats = getShiftStats(s, now);
      acc.jetonsUsed += stats.jetonsUsedGames;
      acc.fmTotal += stats.fmTotal;
      acc.cash += stats.cashCollected;
      acc.credit += stats.creditCreated;
      return acc;
    }, { jetonsUsed: 0, fmTotal: 0, cash: 0, credit: 0 });

    return (
      <div className="section active">
        <div className="section-header">
          <h2>📊 {t('nav_cashier')} (Admin)</h2>
        </div>

        {/* Aggregated KPIs */}
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          <div className="kpi-card info">
            <div className="ico">🪙</div>
            <div className="lbl">Jetons (today)</div>
            <div className="val">{aggregates.jetonsUsed}</div>
          </div>
          <div className="kpi-card warn">
            <div className="ico">⚠️</div>
            <div className="lbl">{t('faux_mises')} (today)</div>
            <div className="val">{aggregates.fmTotal}</div>
          </div>
          <div className="kpi-card green">
            <div className="ico">💵</div>
            <div className="lbl">{t('cash_collected')} (today)</div>
            <div className="val">{fmt(aggregates.cash)} dh</div>
          </div>
          <div className="kpi-card warn">
            <div className="ico">💳</div>
            <div className="lbl">{t('credit_outstanding')} (today)</div>
            <div className="val">{fmt(aggregates.credit)} dh</div>
          </div>
        </div>

        {/* Active Shifts */}
        <div className="settings-section" style={{ marginBottom: '22px' }}>
          <h3 style={{ marginBottom: '12px' }}>🔴 {t('active_shifts')} ({activeShifts.length})</h3>
          {activeShifts.length === 0 ? (
            <div className="muted" style={{ padding: '14px 0' }}>{t('no_active_shift')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeShifts.map(s => {
                const stats = getShiftStats(s, now);
                return (
                  <div key={s.id} className="fm-list-item" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>👤 {getStaffName(s.staffId)}</strong>
                      <div className="meta" style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        {t('shift_started')} {fmtTimestamp(s.startTime)} · 🕐 {durationStr(s.startTime)}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-faint)' }}>
                        {stats.games.length} {t('games')} · {stats.payments.length} {t('payments')}
                        {stats.fauxMises.length > 0 ? ` · ⚠️ ${stats.fauxMises.length} faux-mises` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--green)' }}>💵 Cash: +{fmt(stats.cashCollected)}dh</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>🪙 Drawer: {stats.jetonsRemaining} remaining</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Closed Shifts History */}
        <div className="settings-section">
          <h3 style={{ marginBottom: '12px' }}>📋 {t('shift_history')} ({closedShifts.length})</h3>
          {closedShifts.length === 0 ? (
            <div className="muted" style={{ padding: '14px 0' }}>{t('no_shifts')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {closedShifts.slice(0, 15).map(s => {
                const diffStyle = s.cashDiff > 0 ? { color: 'var(--green)' } : s.cashDiff < 0 ? { color: 'var(--danger)' } : { color: 'var(--text-dim)' };
                return (
                  <div key={s.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <div>
                      <strong>👤 {getStaffName(s.staffId)}</strong>
                      <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '2px' }}>
                        {fmtDate(s.startTime)} — {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text)' }}>💰 expected: {fmt(s.expectedCash)}dh</span>
                      <div style={{ fontSize: '11px', marginTop: '2px', ...diffStyle }}>
                        diff: {s.cashDiff > 0 ? `+${fmt(s.cashDiff)}` : fmt(s.cashDiff)}dh
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= STAFF VIEW =================

  // 1. Shift is not open
  if (!activeShift) {
    const myShifts = shifts
      .filter(s => s.staffId === currentUser?.id)
      .sort((a, b) => b.startTime - a.startTime);

    return (
      <div className="section active">
        <div className="section-header">
          <h2>💰 {t('nav_cashier')}</h2>
        </div>

        <div className="shift-no-active" style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-2)', borderRadius: '14px', border: '2px dashed var(--border)', marginBottom: '22px' }}>
          <div className="icon" style={{ fontSize: '48px', marginBottom: '14px' }}>💰</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>{t('no_active_shift')}</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '22px', maxWidth: '320px', margin: '0 auto 22px' }}>
            {t('start_shift_hint')}
          </p>

          <form onSubmit={handleOpenShift} style={{ maxWidth: '320px', margin: '0 auto', textAlign: 'left' }}>
            <div className="field">
              <label>{t('starting_cash')} (dh)</label>
              <input 
                type="number" 
                value={startingCash} 
                onChange={(e) => setStartingCash(parseFloat(e.target.value) || 0)} 
              />
            </div>
            <div className="field">
              <label>{t('starting_jetons')}</label>
              <input 
                type="number" 
                value={startingJetons} 
                onChange={(e) => setStartingJetons(parseInt(e.target.value) || 0)} 
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '12px' }} disabled={isOpeningShift}>
              {isOpeningShift ? '⏳ ' + t('opening') || 'Opening...' : '▶ ' + t('open_shift')}
            </button>
          </form>
        </div>

        {/* Shift History */}
        {myShifts.length > 0 && (
          <div className="settings-section">
            <h3 style={{ marginBottom: '12px', color: 'var(--accent)' }}>📋 {t('shift_history')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myShifts.slice(0, 10).map(s => (
                <div key={s.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <strong>🕒 {fmtDate(s.startTime)}</strong>
                    <div style={{ color: 'var(--text-dim)', fontSize: '10px', marginTop: '2px' }}>
                      Duration: {durationStr(s.startTime, s.endTime)}
                    </div>
                  </div>
                  <span style={{ fontWeight: '700', color: 'var(--text-dim)' }}>
                    drawer diff: {s.cashDiff > 0 ? `+${fmt(s.cashDiff)}` : fmt(s.cashDiff)}dh
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Active Staff Shift
  const stats = getShiftStats(activeShift, now);
  const duration = durationStr(activeShift.startTime);
  const reasons = { misshot: t('fm_reason_misshot'), machine: t('fm_reason_machine'), other: t('fm_reason_other') };

  return (
    <div className="section active">
      <div className="section-header">
        <h2>💰 {t('nav_cashier')}</h2>
      </div>

      <div className="shift-hero">
        <div className="head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div className="title" style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="live-dot" style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--green)', borderRadius: '50%' }}></span> 
              <span>{t('shift')} - {currentUser.name}</span>
            </div>
            <div className="meta" style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
              {t('shift_started')} {fmtTimestamp(activeShift.startTime)} · <span className="live-timer" style={{ color: 'var(--green)' }}>{duration}</span>
            </div>
          </div>
          <div className="shift-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {settings.enableJetonSales && (
              <button type="button" className="btn btn-sm btn-success" onClick={onSellJetons}>
                💰 {t('sell_jetons')}
              </button>
            )}
            <button type="button" className="btn btn-sm" onClick={onAddJetons}>
              + {t('add_jetons')}
            </button>
            <button type="button" className="btn btn-warning btn-sm" onClick={onAddFauxMise}>
              ⚠️ {t('add_faux_mise')}
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onCloseShift(activeShift.id)}>
              ⏹ {t('close_shift')}
            </button>
          </div>
        </div>

        {/* Active shift stats grid */}
        <div className="shift-grid">
          <div className="shift-stat gold">
            <div className="lbl">{t('starting_jetons')}</div>
            <div className="val">{stats.startingJetons}</div>
            {stats.addedJetons > 0 && <div className="delta">+{stats.addedJetons} {t('jetons_added')}</div>}
          </div>
          <div className="shift-stat info">
            <div className="lbl">{t('jetons_used_games')}</div>
            <div className="val">{stats.jetonsUsedGames}</div>
            <div className="delta">{stats.games.length} {t('games')}</div>
          </div>
          {stats.jetonsSold > 0 && (
            <div className="shift-stat" style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid var(--green)' }}>
              <div className="lbl" style={{ color: 'var(--green)' }}>💰 Jetons vendus</div>
              <div className="val" style={{ color: 'var(--green)' }}>{stats.jetonsSold}</div>
              <div className="delta" style={{ color: 'var(--green)' }}>{fmt(stats.jetonsSold * settings.jetonPrice)}dh</div>
            </div>
          )}
          <div className="shift-stat warn">
            <div className="lbl">{t('faux_mises')}</div>
            <div className="val">{stats.fmTotal}</div>
            <div className="delta">{stats.fauxMises.length} incidents</div>
          </div>
          <div className="shift-stat green">
            <div className="lbl">{t('jetons_remaining')}</div>
            <div className="val">{stats.jetonsRemaining}</div>
          </div>
          <div className="shift-stat gold">
            <div className="lbl">{t('starting_cash')}</div>
            <div className="val">{fmt(stats.startingCash)}dh</div>
          </div>
          <div className="shift-stat gold">
            <div className="lbl">{t('cash_collected')}</div>
            <div className="val">{fmt(stats.cashCollected)}dh</div>
            <div className="delta">{stats.payments.length} {t('payments')}</div>
          </div>
          <div className={`shift-stat ${stats.creditCreated > 0 ? 'warn' : 'green'}`}>
            <div className="lbl">{t('credit_outstanding')}</div>
            <div className="val">{fmt(stats.creditCreated)}dh</div>
            <div className="delta">{t('shift')}</div>
          </div>
        </div>
      </div>

      {/* Incident Log (Faux Mises) */}
      <div className="settings-section" style={{ marginTop: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0 }}>⚠️ {t('faux_mises')} ({stats.fmTotal})</h3>
          <button type="button" className="btn btn-sm btn-warning" onClick={onAddFauxMise}>
            + {t('add_faux_mise')}
          </button>
        </div>
        
        {stats.fauxMises.length === 0 ? (
          <div className="muted">{t('no_faux_mise')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...stats.fauxMises].reverse().map(fm => (
              <div key={fm.id} className="fm-list-item" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <div style={{ flex: 1 }}>
                  <strong>{getTableName(fm.tableId)} · {reasons[fm.reason] || fm.reason}</strong>
                  {fm.note && <span style={{ color: 'var(--text-dim)', fontSize: '11px', marginLeft: '6px' }}>({fm.note})</span>}
                  <div style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '2px' }}>
                    🕐 {fmtTimestamp(fm.time)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '14px' }}>
                    {fm.count} jeton{fm.count > 1 ? 's' : ''}
                  </span>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-danger" 
                    onClick={() => onRemoveFauxMise(fm.id)}
                    style={{ padding: '4px 8px' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
