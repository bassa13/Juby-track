import { Header } from './Header.jsx';
import { Navbar } from './Navbar.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

export function DashboardLayout({ activeTab, setActiveTab, children }) {
  const { dir } = useTranslation();

  return (
    <div id="appContent" dir={dir}>
      <Header />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main>
        {children}
      </main>
    </div>
  );
}
