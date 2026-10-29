import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';

export function AddJetonsModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const addJetonsToDrawer = useJubyStore((state) => state.addJetonsToDrawer);

  const [count, setCount] = useState('50');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (pendingAction?.type !== 'addJetons') return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleConfirm = () => {
    if (isSubmitting) return;
    setError('');
    const countVal = parseInt(count) || 0;

    if (countVal <= 0) {
      setError(t('err_required') || 'Champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    const res = addJetonsToDrawer(countVal, note);
    if (res && res.success) {
      setPendingAction(null);
    } else {
      setIsSubmitting(false);
      setError(t(res?.error || 'Error') || 'Error');
    }
  };

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('add_more_jetons')}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="login-error" style={{ marginBottom: '12px' }}>{error}</div>}

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
            <label>{t('note')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Réapprovisionnement stock"
            />
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? '⏳...' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
