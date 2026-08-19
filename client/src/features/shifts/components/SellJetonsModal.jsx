import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fmt } from '../../../core/utils/timeUtils.js';

export function SellJetonsModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const settings = useJubyStore((state) => state.settings);
  const sellJetons = useJubyStore((state) => state.sellJetons);

  const [count, setCount] = useState('10');
  const [remiz, setRemiz] = useState('0');
  const [error, setError] = useState('');

  if (pendingAction?.type !== 'sellJetons') return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleConfirm = () => {
    setError('');
    const countVal = parseInt(count) || 0;
    const remizVal = parseFloat(remiz) || 0;

    if (countVal <= 0) {
      setError(t('err_required') || 'Champs obligatoires');
      return;
    }

    const res = sellJetons(countVal, remizVal);
    if (res.success) {
      setPendingAction(null);
    } else {
      setError(t(res.error) || 'Error');
    }
  };

  const jetonPrice = settings.jetonPrice || 5;
  const rawTotal = (parseInt(count) || 0) * jetonPrice;
  const finalTotal = Math.max(0, rawTotal - (parseFloat(remiz) || 0));

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>💰 {t('sell_jetons')}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="login-error" style={{ marginBottom: '12px' }}>{error}</div>}

          <div className="cost-display" style={{ marginBottom: '14px' }}>
            <div className="lbl">Prix final ({count} jetons)</div>
            <div className="num">{fmt(finalTotal)} dh</div>
            {parseFloat(remiz) > 0 && (
              <div className="muted" style={{ marginTop: '4px' }}>
                Prix brut: {fmt(rawTotal)} dh · Remise: -{fmt(parseFloat(remiz))} dh
              </div>
            )}
          </div>

          <div className="field">
            <label>{t('how_many_jetons')}</label>
            <input
              type="number"
              min="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Remise (dh)</label>
            <input
              type="number"
              min="0"
              value={remiz}
              onChange={(e) => setRemiz(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-success" onClick={handleConfirm}>
            💰 {t('sell_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
