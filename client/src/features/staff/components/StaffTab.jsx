import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fmt } from '../../../core/utils/timeUtils.js';

export function StaffTab({ onAddStaff, onEditStaff }) {
  const { t } = useTranslation();
  const currentUser = useJubyStore((state) => state.currentUser);
  const staffList = useJubyStore((state) => state.staff);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const deleteStaff = useJubyStore((state) => state.deleteStaff);

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) return null;

  const handleDelete = (staffId) => {
    if (window.confirm(t('delete_confirm'))) {
      const res = deleteStaff(staffId);
      if (res && !res.success) {
        alert(t(res.error) || 'Error');
      }
    }
  };

  return (
    <div className="section active">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>👔 {t('nav_staff')}</h2>
        <button type="button" className="btn btn-primary" onClick={onAddStaff}>
          + {t('add_staff')}
        </button>
      </div>

      <div className="data-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('username')}</th>
              <th>{t('role')}</th>
              <th className="hide-mobile">{t('staff_revenue')}</th>
              <th className="hide-mobile">{t('staff_games')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(s => {
              const staffGamesCount = games.filter(g => g.endTime && (g.staffId === s.id || g.endStaffId === s.id)).length;
              const collected = payments.filter(p => p.staffId === s.id).reduce((sum, p) => sum + p.amount, 0);
              
              return (
                <tr key={s.id}>
                  <td>
                    <div className="row gap-sm" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className="player-avatar sm" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                        {(s.name || '?')[0].toUpperCase()}
                      </div>
                      <b>{s.name}</b>
                    </div>
                  </td>
                  <td>{s.username}</td>
                  <td>
                    <span
                      className={`status-badge ${s.role === 'admin' ? 'busy' : ''}`}
                      style={s.role === 'admin' ? { background: 'rgba(212,175,55,0.18)', color: 'var(--accent)' } : {}}
                    >
                      {t(`role_${s.role}`)}
                    </span>
                  </td>
                  <td className="hide-mobile">{fmt(collected)}dh</td>
                  <td className="hide-mobile">{staffGamesCount}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="btn btn-sm" onClick={() => onEditStaff(s.id)}>
                        ✏️
                      </button>
                      {s.id !== 'admin' && s.id !== currentUser.id && (
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
