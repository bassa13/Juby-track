import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { initials } from '../../../core/utils/timeUtils.js';

export function PlayerModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const players = useJubyStore((state) => state.players);
  const addPlayer = useJubyStore((state) => state.addPlayer);
  const deletePlayer = useJubyStore((state) => state.deletePlayer);
  const currentUser = useJubyStore((state) => state.currentUser);

  const isAdd = pendingAction?.type === 'addPlayer';
  const isEdit = pendingAction?.type === 'editPlayer';

  const editingPlayer = isEdit ? players.find((p) => p.id === pendingAction.playerId) : null;

  const [name, setName] = useState(() => (editingPlayer ? editingPlayer.name || '' : ''));
  const [lastname, setLastname] = useState(() => (editingPlayer ? editingPlayer.lastname || '' : ''));
  const [phone, setPhone] = useState(() => (editingPlayer ? editingPlayer.phone || '' : ''));
  const [birthdate, setBirthdate] = useState(() => (editingPlayer ? editingPlayer.birthdate || '' : ''));
  const [photo, setPhoto] = useState(() => (editingPlayer ? editingPlayer.photo || null : null));
  const [isStaff, setIsStaff] = useState(() => (editingPlayer ? Boolean(editingPlayer.isStaff) : false));

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdd && !isEdit) return null;

  const isAdmin = currentUser?.role === 'admin';

  const handleClose = () => {
    setPendingAction(null);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Photo max 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhoto(event.target?.result || null);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('err_required') || 'Veuillez saisir le prénom');
      return;
    }

    setIsSubmitting(true);

    try {
      const playerData = {
        name: trimmedName,
        lastname: lastname.trim(),
        phone: phone.trim(),
        birthdate,
        photo,
        isStaff
      };

      if (isEdit && editingPlayer) {
        playerData.id = editingPlayer.id;
      }

      const res = addPlayer(playerData);
      if (res && res.success) {
        setSuccess(isEdit ? (t('updated') || 'Mis à jour ✅') : (t('saved') || 'Enregistré ✅'));
        setTimeout(() => {
          setPendingAction(null);
        }, 300);
      } else {
        setError(res?.error || 'Erreur lors de l’enregistrement');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err?.message || 'Erreur inattendue');
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!editingPlayer) return;
    if (window.confirm(t('delete_confirm') || 'Supprimer ce client?')) {
      deletePlayer(editingPlayer.id);
      setPendingAction(null);
    }
  };

  const title = isEdit ? `✏️ ${t('player_profile') || 'Modifier Client'}` : `➕ ${t('add_player') || 'Ajouter Client'}`;

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="modal-body">
            {error && (
              <div className="login-error" style={{ marginBottom: '14px' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="status-badge busy" style={{ background: 'rgba(46,204,113,0.15)', color: 'var(--green)', width: '100%', textAlign: 'center', padding: '10px', fontSize: '13px', marginBottom: '14px' }}>
                {success}
              </div>
            )}

            {/* Photo Avatar Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
              <div className="player-avatar lg" style={{ background: 'linear-gradient(135deg, var(--accent), var(--green))', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '22px', overflow: 'hidden', flexShrink: 0 }}>
                {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials({ name, lastname })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="btn btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex' }}>
                  📷 {t('upload_photo') || 'Choisir photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                </label>
                {photo && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setPhoto(null)} style={{ padding: '2px 8px', fontSize: '11px' }}>
                    🗑️ {t('remove_photo') || 'Supprimer photo'}
                  </button>
                )}
              </div>
            </div>

            {/* First Name & Last Name */}
            <div className="row gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label>{t('name') || 'Prénom'} *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Youssef"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>{t('lastname') || 'Nom'}</label>
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="ex: Bassa"
                />
              </div>
            </div>

            {/* Phone & Birthdate */}
            <div className="row gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label>{t('phone') || 'Téléphone'}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0612345678"
                />
              </div>
              <div className="field">
                <label>{t('birthdate') || 'Date de naissance'}</label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
              </div>
            </div>

            {/* Staff Client Toggle */}
            <div className="field" style={{ marginTop: '6px' }}>
              <div
                className={`staff-toggle ${isStaff ? 'active' : ''}`}
                onClick={() => setIsStaff(!isStaff)}
              >
                <div className="toggle-track">
                  <div className="toggle-thumb"></div>
                </div>
                <div className="toggle-label">
                  👔 {t('is_staff_client') || 'Client Staff'}
                  <span className="muted" style={{ display: 'block', fontSize: '11px', fontWeight: 'normal' }}>
                    {t('staff_free_play') || 'Joue gratuitement (compte jetons)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {isEdit && isAdmin && (
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                  🗑️ {t('delete_confirm') ? 'Supprimer' : 'Delete'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn" onClick={handleClose}>
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ ...' : (t('save') || 'Enregistrer')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
