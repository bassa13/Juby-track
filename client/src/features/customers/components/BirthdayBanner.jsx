import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { hoursUntilBirthday, isBirthdayToday, fullName } from '../../../core/utils/timeUtils.js';

export function BirthdayBanner() {
  const { t } = useTranslation();
  const players = useJubyStore((state) => state.players);

  const todayStr = new Date().toDateString();
  const dismissedKey = `juby-bday-dismissed-${todayStr}`;

  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(dismissedKey) === '1';
  });

  const handleDismiss = () => {
    localStorage.setItem(dismissedKey, '1');
    setDismissed(true);
  };

  // Find upcoming birthdays
  const upcoming = players
    .filter(p => p.birthdate)
    .map(p => ({
      p,
      hours: hoursUntilBirthday(p.birthdate),
      isToday: isBirthdayToday(p.birthdate)
    }))
    .filter(x => x.isToday || (x.hours > 0 && x.hours <= 24))
    .sort((a, b) => a.hours - b.hours);

  if (dismissed || upcoming.length === 0) {
    return null;
  }

  return (
    <div className="bday-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(243,156,18,0.12))', border: '1px solid var(--accent)', borderRadius: '12px', padding: '12px 18px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '24px' }}>🎂</div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--accent)', marginBottom: '4px' }}>
            {t('bday_alert_title')} ({upcoming.length})
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', overflowX: 'auto' }}>
            {upcoming.map(x => (
              <span 
                key={x.p.id} 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                <strong>{fullName(x.p)}</strong>
                <span style={{ fontSize: '10px', color: 'var(--accent)' }}>
                  {x.isToday ? t('bday_today') : t('bday_tomorrow')}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <button 
        type="button" 
        onClick={handleDismiss} 
        style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }}
      >
        ×
      </button>
    </div>
  );
}
