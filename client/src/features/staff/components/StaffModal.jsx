import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';

export function StaffModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const staffList = useJubyStore((state) => state.staff);
  const addStaff = useJubyStore((state) => state.addStaff);

  const isEdit = pendingAction?.type === 'editStaff';
  const isAdd = pendingAction?.type === 'addStaff';

  const editingStaff = isEdit ? staffList.find(s => s.id === pendingAction.staffId) : null;

  const [name, setName] = useState(() => editingStaff ? (editingStaff.name || '') : '');
  const [username, setUsername] = useState(() => editingStaff ? (editingStaff.username || '') : '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(() => editingStaff ? (editingStaff.role || 'staff') : 'staff');
  const [error, setError] = useState('');

  if (!isAdd && !isEdit) return null;

  const handleClose = () => {
    setPendingAction(null);
  };

  const handleConfirm = () => {
    setError('');
    if (!name.trim() || !username.trim()) {
      setError(t('err_required'));
      return;
    }
    if (isAdd && !password) {
      setError(t('err_required'));
      return;
    }

    const staffData = {
      name: name.trim(),
      username: username.trim(),
      role
    };

    if (password) {
      staffData.password = password; // Only update if password was typed
    }

    if (isEdit) {
      staffData.id = editingStaff.id;
    }

    addStaff(staffData);
    setPendingAction(null);
  };

  const title = isEdit ? 'Modifier Staff' : t('add_staff');

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="login-error" style={{ marginBottom: '12px' }}>{error}</div>}

          <div className="field">
            <label>{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>{t('username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit && editingStaff?.id === 'admin'}
            />
          </div>

          <div className="field">
            <label>
              {t('password')} {isEdit ? '(laisser vide pour ne pas changer)' : ''}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="field">
            <label>{t('role')}</label>
            <div className="options-grid">
              <button
                type="button"
                className={`option-btn ${role === 'staff' ? 'selected' : ''}`}
                onClick={() => setRole('staff')}
                disabled={isEdit && editingStaff?.id === 'admin'}
              >
                {t('role_staff')}
              </button>
              <button
                type="button"
                className={`option-btn ${role === 'admin' ? 'selected' : ''}`}
                onClick={() => setRole('admin')}
                disabled={isEdit && editingStaff?.id === 'admin'}
              >
                {t('role_admin')}
              </button>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
