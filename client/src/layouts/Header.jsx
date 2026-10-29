import { useJubyStore } from '../core/store/useJubyStore.js';
import { useTranslation } from '../hooks/useTranslation.js';
import { getPlayerStats } from '../core/utils/customerLedger.js';
import { isToday, initials, fmt } from '../core/utils/timeUtils.js';

export function Header() {
  const { t, lang, setLang } = useTranslation();
  const currentUser = useJubyStore((state) => state.currentUser);
  const logout = useJubyStore((state) => state.logout);
  
  const payments = useJubyStore((state) => state.payments);
  const games = useJubyStore((state) => state.games);
  const players = useJubyStore((state) => state.players);
  const tables = useJubyStore((state) => state.tables);

  const isAdmin = currentUser?.role === 'admin';
  const isInvestor = currentUser?.role === 'investor';

  // Calculate stats
  const staffFilter = (isAdmin || isInvestor) ? null : currentUser?.id;
  
  // Today's revenue: Admin sees all, Staff sees their own collected payments
  const todayRev = payments
    .filter(p => isToday(p.date) && (!staffFilter || p.staffId === staffFilter))
    .reduce((s, p) => s + p.amount, 0);

  // Total debt
  const totalDebt = players.reduce((s, p) => {
    const stats = getPlayerStats(p.id, { players, games, payments }, staffFilter);
    return s + stats.balance;
  }, 0);

  // Active games
  const activeGamesCount = games.filter(g => !g.endTime).length;
  const totalTablesCount = tables.length;

  const userInitials = currentUser ? initials(currentUser) : '?';

  return (
    <header>
      <div className="header-row">
        <div className="brand">
          <div className="brand-logo">🎱</div>
          <div>
            <div className="brand-name">{t('club_name') || 'Juby Club'}</div>
            <div className="brand-sub">{t('brand_sub') || 'Pool & Snooker'}</div>
          </div>
        </div>

        <div className="header-stats">
          <div className="header-stat">
            <span>💰 {t('today') || "Aujourd'hui"}:</span>
            <span className="num">{fmt(todayRev)} dh</span>
          </div>
          <div className="header-stat debt">
            <span>🔴 {t('debt') || 'Dette'}:</span>
            <span className="num">{fmt(totalDebt)} dh</span>
          </div>
          <div className="header-stat tables">
            <span>🎱 {t('active') || 'Actives'}:</span>
            <span className="num">{activeGamesCount}/{totalTablesCount}</span>
          </div>
        </div>

        <div className="header-actions">
          <select 
            className="lang-select" 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
            <option value="ar">العربية</option>
          </select>

          {currentUser && (
            <div className="user-chip">
              <div className="avatar">{userInitials}</div>
              <div className="info">
                <div className="name">{currentUser.name}</div>
                <div className={`role ${currentUser.role === 'admin' ? 'admin' : ''}`}>
                  {t(`role_${currentUser.role}`) || currentUser.role}
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-sm btn-danger" 
                onClick={logout} 
                style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '6px' }}
                title={t('logout_q')}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
