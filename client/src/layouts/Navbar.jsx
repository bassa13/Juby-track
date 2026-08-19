import { useJubyStore } from '../core/store/useJubyStore.js';
import { useTranslation } from '../hooks/useTranslation.js';

export function Navbar({ activeTab, setActiveTab }) {
  const { t } = useTranslation();
  const currentUser = useJubyStore((state) => state.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  const tabs = [
    { key: 'tables', icon: '🎯', tkey: 'nav_tables' },
    { key: 'cashier', icon: '💰', tkey: 'nav_cashier' },
    { key: 'players', icon: '👥', tkey: 'nav_players' },
    { key: 'playhistory', icon: '📊', tkey: 'nav_playhistory' },
    { key: 'history', icon: '📜', tkey: 'nav_history' }
  ];

  if (isAdmin) {
    tabs.push({ key: 'staff', icon: '👔', tkey: 'nav_staff', admin: true });
    tabs.push({ key: 'shifts', icon: '📋', tkey: 'nav_shifts', admin: true });
    tabs.push({ key: 'reports', icon: '📊', tkey: 'nav_reports', admin: true });
    tabs.push({ key: 'settings', icon: '⚙️', tkey: 'nav_settings', admin: true });
  }

  return (
    <nav>
      <div className="nav-inner">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            <span>{t(tab.tkey)}</span>
            {tab.admin && <span className="badge-admin">ADMIN</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
