import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { TableCard } from './TableCard.jsx';
import { BirthdayBanner } from '../../customers/components/BirthdayBanner.jsx';

export function TablesTab({ onStartGame, onEndGame, onAddFrame, onManageQueue, onAddToQueue, onOpenTvPanel }) {
  const { t } = useTranslation();
  const tables = useJubyStore((state) => state.tables);
  const activeShift = useJubyStore((state) => state.shifts.find(s => !s.endTime));

  return (
    <div className="section active">
      {/* Birthday Alert Notification */}
      <BirthdayBanner />

      {/* Cashier Shift Warning Banner */}
      {!activeShift && (
        <div 
          className="warning-banner" 
          style={{ 
            background: 'rgba(243,156,18,0.15)', 
            borderLeft: '4px solid var(--warning)', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '18px', 
            color: 'var(--warning)', 
            fontSize: '14px',
            lineHeight: '1.5'
          }}
        >
          <strong>⚠️ {t('no_active_shift') || 'Aucune session ouverte'}</strong>
          <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-dim)' }}>
            {t('start_shift_hint') || 'Ouvre d\'abord une session dans Ma Caisse pour commencer à jouer.'}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="section-header">
        <h2>🎯 {t('nav_tables')}</h2>
      </div>

      {/* Tables Grid */}
      <div className="tables-grid">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onStartGame={onStartGame}
            onEndGame={onEndGame}
            onAddFrame={onAddFrame}
            onManageQueue={onManageQueue}
            onAddToQueue={onAddToQueue}
            onOpenTvPanel={onOpenTvPanel}
          />
        ))}
      </div>
    </div>
  );
}
