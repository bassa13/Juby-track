import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';

export function AddFauxMiseModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const tables = useJubyStore((state) => state.tables);
  const addFauxMise = useJubyStore((state) => state.addFauxMise);

  const [tableId, setTableId] = useState('');
  const [count, setCount] = useState('1');
  const [reason, setReason] = useState('misshot');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (pendingAction?.type !== 'addFauxMise') return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleConfirm = () => {
    setError('');
    if (!tableId) {
      setError(t('err_required') || 'Champs obligatoires');
      return;
    }
    const countVal = parseInt(count) || 0;
    if (countVal <= 0) {
      setError(t('err_required') || 'Champs obligatoires');
      return;
    }

    addFauxMise(tableId, countVal, reason, note);
    setPendingAction(null);
  };

  const reasons = [
    { key: 'misshot', label: t('fm_reason_misshot') },
    { key: 'machine', label: t('fm_reason_machine') },
    { key: 'other', label: t('fm_reason_other') }
  ];

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('add_faux_mise')}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="login-error" style={{ marginBottom: '12px' }}>{error}</div>}

          <div className="field">
            <label>{t('which_table')}</label>
            <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
              <option value="">{t('select_table') || '-- Choisir table --'}</option>
              {tables.map(tbl => (
                <option key={tbl.id} value={tbl.id}>{tbl.label}</option>
              ))}
            </select>
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
            <label>{t('reason')}</label>
            <div className="options-grid">
              {reasons.map(r => (
                <button
                  key={r.key}
                  type="button"
                  className={`option-btn ${reason === r.key ? 'selected' : ''}`}
                  onClick={() => setReason(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>{t('optional_note') || t('note')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-warning" onClick={handleConfirm}>
            {t('fm_add_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
