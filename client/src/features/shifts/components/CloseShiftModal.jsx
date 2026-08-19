import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fmt, durationStr } from '../../../core/utils/timeUtils.js';

export function CloseShiftModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const shifts = useJubyStore((state) => state.shifts);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const settings = useJubyStore((state) => state.settings);
  const closeShift = useJubyStore((state) => state.closeShift);

  const activeShift = shifts.find(s => !s.endTime);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate statistics for active shift
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
          staffJetonsUsed += g.staffJetons;
        }
      }
    });

    // Payments collected by this staff
    const shiftPayments = payments.filter(p =>
      p.staffId === shift.staffId &&
      p.date >= start && p.date <= end
    );

    const totalCollected = shiftPayments.reduce((s, p) => s + p.amount, 0);

    // Jeton Sales
    const jetonSalesList = shift.jetonSales || [];
    const jetonsSold = jetonSalesList.reduce((s, x) => s + x.count, 0);
    const jetonSalesRev = jetonSalesList.reduce((s, x) => s + x.total, 0);

    // Added Jetons to Drawer
    const addedJetonsList = shift.addedJetons || [];
    const jetonsAddedToDrawer = addedJetonsList.reduce((s, x) => s + x.count, 0);

    // Faux Mises
    const fauxMisesList = shift.fauxMises || [];
    const fauxMisesCount = fauxMisesList.reduce((s, x) => s + x.count, 0);

    // Jeton Math Balance
    const startJ = shift.startingJetons || settings.defaultStartingJetons || 200;
    const expectedRemainingJetons = startJ + jetonsAddedToDrawer - jetonsUsedGames - jetonsSold - fauxMisesCount;

    // Cash Math Balance
    const startC = shift.startingCash || 0;
    const expectedTotalCash = startC + totalCollected + jetonSalesRev;

    return {
      shiftGamesCount: shiftGames.length,
      totalCharged,
      totalCollected,
      jetonsUsedGames,
      staffJetonsUsed,
      jetonSalesRev,
      jetonsSold,
      jetonsAddedToDrawer,
      fauxMisesCount,
      startJ,
      expectedRemainingJetons,
      startC,
      expectedTotalCash
    };
  };

  const stats = getShiftStats(activeShift, activeShift?.endTime || activeShift?.startTime || 0);

  const [actualCash, setActualCash] = useState(() => stats ? fmt(stats.expectedTotalCash).toString() : '');

  if (!activeShift || !stats || pendingAction?.type !== 'closeShift') return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleConfirmClose = () => {
    setIsSubmitting(true);
    const finalCashVal = parseFloat(actualCash) || 0;
    const res = closeShift(activeShift.id, finalCashVal);
    setIsSubmitting(false);

    if (res.success) {
      setPendingAction(null);
    }
  };

  const currentEnteredCash = parseFloat(actualCash) || 0;
  const cashDiff = currentEnteredCash - stats.expectedTotalCash;

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>📋 {t('close_shift')}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="shift-summary-box" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <span className="muted">{t('staff_member')}:</span> <b>{activeShift.staffName}</b>
              </div>
              <div>
                <span className="muted">{t('duration')}:</span> <b>{durationStr(activeShift.startTime)}</b>
              </div>
            </div>

            {/* Grid stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '12px' }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{t('cash_collected')}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--green)', marginTop: '2px' }}>+{fmt(stats.totalCollected)} dh</div>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Vente Jetons</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent)', marginTop: '2px' }}>+{fmt(stats.jetonSalesRev)} dh ({stats.jetonsSold} J)</div>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Jetons Restants</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text)', marginTop: '2px' }}>{stats.expectedRemainingJetons} J</div>
              </div>
            </div>
          </div>

          <div className="field">
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>💵 Cash Réel en caisse (dh)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              style={{ fontSize: '20px', fontWeight: 'bold', height: '48px' }}
              autoFocus
            />
            <div className="muted" style={{ marginTop: '6px', fontSize: '12px' }}>
              Cash attendu: <b>{fmt(stats.expectedTotalCash)} dh</b> (Fond initial: {stats.startC} dh + Recettes: {stats.totalCollected + stats.jetonSalesRev} dh)
            </div>
          </div>

          {cashDiff !== 0 && (
            <div className="alert-box" style={{ 
              background: cashDiff > 0 ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)', 
              border: `1px solid ${cashDiff > 0 ? 'var(--green)' : 'var(--danger)'}`, 
              borderRadius: '8px', 
              padding: '10px 14px', 
              marginTop: '12px',
              color: cashDiff > 0 ? 'var(--green)' : 'var(--danger)',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {cashDiff > 0 ? `🟢 Excédent de cash: +${fmt(cashDiff)} dh` : `🔴 Déficit de cash: ${fmt(cashDiff)} dh`}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-danger" onClick={handleConfirmClose} disabled={isSubmitting}>
            🔒 {isSubmitting ? 'Fermeture...' : t('close_shift')}
          </button>
        </div>
      </div>
    </div>
  );
}
