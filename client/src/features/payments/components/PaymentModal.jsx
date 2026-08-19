import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName, initials, fmt } from '../../../core/utils/timeUtils.js';
import { getPlayerStats } from '../../../core/utils/customerLedger.js';

export function PaymentModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const makePayment = useJubyStore((state) => state.makePayment);
  const addAdvance = useJubyStore((state) => state.addAdvance);

  const isPayMode = pendingAction?.type === 'pay';
  const isAdvanceMode = pendingAction?.type === 'advance';

  const playerId = pendingAction?.playerId;
  const player = playerId ? players.find(p => p.id === playerId) : null;
  const stats = player ? getPlayerStats(player.id, { players, games, payments }) : null;

  const [amount, setAmount] = useState(() => {
    if (stats && isPayMode) return fmt(stats.balance).toString();
    if (isAdvanceMode) return '50';
    return '';
  });

  const [note, setNote] = useState(() => {
    if (isAdvanceMode) return 'Avance/Crédit';
    return '';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!player || !stats || (!isPayMode && !isAdvanceMode)) return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleConfirm = () => {
    setError('');
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError(t('err_required'));
      return;
    }

    setIsSubmitting(true);
    let res;
    if (isPayMode) {
      res = makePayment(player.id, val, note);
    } else {
      res = addAdvance(player.id, val, note);
    }
    setIsSubmitting(false);

    if (res.success) {
      setPendingAction(null);
    }
  };

  const presets = isPayMode 
    ? [
        { label: `${t('pay_full')} (${fmt(stats.balance)})`, value: fmt(stats.balance) },
        { label: t('pay_half'), value: fmt(stats.balance / 2) },
        { label: '20', value: 20 },
        { label: '50', value: 50 },
        { label: '100', value: 100 }
      ]
    : [
        { label: '20', value: 20 },
        { label: '50', value: 50 },
        { label: '100', value: 100 },
        { label: '200', value: 200 }
      ];

  const title = isPayMode ? t('pay_title') : t('advance_payment');

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="login-error" style={{ marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <div className="profile-head" style={{ border: 'none', paddingBottom: 0, marginBottom: '14px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            {player.photo ? (
              <div className="player-avatar lg" style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden' }}><img src={player.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /></div>
            ) : (
              <div className="player-avatar lg" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>{initials(player)}</div>
            )}
            <div className="profile-info">
              <div className="profile-name" style={{ fontSize: '16px', fontWeight: 'bold' }}>{fullName(player)}</div>
              <div className="profile-meta" style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                {isPayMode ? (
                  <>{t('debt')}: <b style={{ color: 'var(--warning)' }}>{fmt(stats.balance)} dh</b></>
                ) : (
                  stats.credit > 0 ? <>{t('credit_balance')}: <b style={{ color: 'var(--green)' }}>{fmt(stats.credit)} dh</b></> : null
                )}
              </div>
            </div>
          </div>

          {isAdvanceMode && (
            <p className="muted" style={{ marginBottom: '14px', fontSize: '12px' }}>💡 {t('advance_explain')}</p>
          )}

          <div className="field">
            <label>{t('amount')}</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div className="row gap-sm wrap" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-sm"
                onClick={() => setAmount(preset.value.toString())}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="field">
            <label>{t('note')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Saving...' : t('save_pay')}
          </button>
        </div>
      </div>
    </div>
  );
}
