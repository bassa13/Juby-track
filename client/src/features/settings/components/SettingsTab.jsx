import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';

export function SettingsTab() {
  const { t } = useTranslation();
  const settings = useJubyStore((state) => state.settings);
  const saveSettings = useJubyStore((state) => state.saveSettings);
  const fullStoreState = useJubyStore((state) => state); // for backup export

  // Local Form States
  const [jetonPrice, setJetonPrice] = useState(settings.jetonPrice || 5);
  const [snookerDayRate, setSnookerDayRate] = useState(settings.snookerDayRate || 15);
  const [snookerNightRate, setSnookerNightRate] = useState(settings.snookerNightRate || 20);
  const [snookerDayStart, setSnookerDayStart] = useState(settings.snookerDayStart || 8);
  const [snookerDayEnd, setSnookerDayEnd] = useState(settings.snookerDayEnd || 16);
  const [discountThreshold, setDiscountThreshold] = useState(settings.discountThreshold || 50);
  const [discountPercent, setDiscountPercent] = useState(settings.discountPercent || 10);
  const [defaultStartingJetons, setDefaultStartingJetons] = useState(settings.defaultStartingJetons || 200);
  const [enableJetonSales, setEnableJetonSales] = useState(settings.enableJetonSales !== false);
  const [tournamentName, setTournamentName] = useState(settings.tournamentName || '');

  // Visual Branding Form States
  const [clubName, setClubName] = useState(settings.branding?.clubName || 'Juby Club');
  const [clubTagline, setClubTagline] = useState(settings.branding?.tagline || 'Pool & Snooker');
  const [accentColor, setAccentColor] = useState(settings.branding?.accentColor || '#d4af37');

  // Telegram Bot Form States
  const [telegramBotToken, setTelegramBotToken] = useState(settings.telegramBotToken || '');
  const [telegramAutoSend, setTelegramAutoSend] = useState(settings.telegramAutoSend !== false);

  // SMS API Webhook Form States
  const [smsApiEnabled, setSmsApiEnabled] = useState(settings.smsApiEnabled !== false);
  const [smsApiKey, setSmsApiKey] = useState(settings.smsApiKey || '');
  const [smsApiBaseUrl, setSmsApiBaseUrl] = useState(settings.smsApiBaseUrl || '');
  const [smsApiSender, setSmsApiSender] = useState(settings.smsApiSender || 'JubyClub');

  const handleSave = (e) => {
    e.preventDefault();
    
    saveSettings({
      jetonPrice: parseFloat(jetonPrice) || 5,
      snookerDayRate: parseFloat(snookerDayRate) || 15,
      snookerNightRate: parseFloat(snookerNightRate) || 20,
      snookerDayStart: parseInt(snookerDayStart) || 8,
      snookerDayEnd: parseInt(snookerDayEnd) || 16,
      discountThreshold: parseFloat(discountThreshold) || 50,
      discountPercent: parseFloat(discountPercent) || 10,
      defaultStartingJetons: parseInt(defaultStartingJetons) || 200,
      enableJetonSales,
      tournamentName,
      telegramBotToken,
      telegramAutoSend,
      smsApiEnabled,
      smsApiKey,
      smsApiBaseUrl,
      smsApiSender,
      branding: {
        ...settings.branding,
        clubName,
        tagline: clubTagline,
        accentColor
      }
    });

    alert(t('settings_saved'));
  };

  const handleExportBackup = () => {
    const backupObj = {
      staff: fullStoreState.staff,
      players: fullStoreState.players,
      games: fullStoreState.games,
      payments: fullStoreState.payments,
      shifts: fullStoreState.shifts,
      tables: fullStoreState.tables,
      smsTemplates: fullStoreState.smsTemplates,
      settings: fullStoreState.settings
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `jubyclub-backup-${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.settings && parsed.tables) {
          fullStoreState.mergeCloudState(parsed);
          alert(t('updated'));
          window.location.reload();
        } else {
          alert('Format invalide');
        }
      } catch {
        alert('Erreur lors du décodage du fichier');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="section active">
      <div className="section-header">
        <h2>⚙️ {t('nav_settings')}</h2>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Tarification settings group */}
          <div className="settings-section">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '14px' }}>
              💰 {t('pricing')}
            </h3>
            
            <div className="field">
              <label>{t('jeton_price')} (dh)</label>
              <input 
                type="number" 
                value={jetonPrice} 
                onChange={(e) => setJetonPrice(e.target.value)} 
              />
            </div>

            <div className="field">
              <label>{t('snooker_day')} (dh)</label>
              <input 
                type="number" 
                value={snookerDayRate} 
                onChange={(e) => setSnookerDayRate(e.target.value)} 
              />
            </div>

            <div className="field">
              <label>{t('snooker_night')} (dh)</label>
              <input 
                type="number" 
                value={snookerNightRate} 
                onChange={(e) => setSnookerNightRate(e.target.value)} 
              />
            </div>

            <div className="row gap-sm" style={{ display: 'flex', gap: '8px' }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Plage Jour Début (h)</label>
                <input 
                  type="number" 
                  value={snookerDayStart} 
                  onChange={(e) => setSnookerDayStart(e.target.value)} 
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Plage Jour Fin (h)</label>
                <input 
                  type="number" 
                  value={snookerDayEnd} 
                  onChange={(e) => setSnookerDayEnd(e.target.value)} 
                />
              </div>
            </div>

            <div className="field">
              <label>{t('discount_threshold')} (dh)</label>
              <input 
                type="number" 
                value={discountThreshold} 
                onChange={(e) => setDiscountThreshold(e.target.value)} 
              />
            </div>

            <div className="field">
              <label>{t('discount_percent')} (%)</label>
              <input 
                type="number" 
                value={discountPercent} 
                onChange={(e) => setDiscountPercent(e.target.value)} 
              />
            </div>

            <div className="field">
              <label>{t('starting_jetons')} default</label>
              <input 
                type="number" 
                value={defaultStartingJetons} 
                onChange={(e) => setDefaultStartingJetons(e.target.value)} 
              />
            </div>

            <label className="staff-toggle" style={{ border: 'none', padding: '6px 0', marginTop: '10px' }}>
              <input 
                type="checkbox" 
                checked={enableJetonSales} 
                onChange={(e) => setEnableJetonSales(e.target.checked)} 
                style={{ width: 'auto', marginRight: '8px' }}
              />
              <span>{t('enable_jeton_sales')}</span>
            </label>
          </div>

          {/* Visual branding settings group */}
          <div className="settings-section">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '14px' }}>
              🎨 {t('branding_section')}
            </h3>

            <div className="field">
              <label>{t('club_name')}</label>
              <input 
                type="text" 
                value={clubName} 
                onChange={(e) => setClubName(e.target.value)} 
              />
            </div>

            <div className="field">
              <label>{t('club_tagline')}</label>
              <input 
                type="text" 
                value={clubTagline} 
                onChange={(e) => setClubTagline(e.target.value)} 
              />
            </div>

            <div className="field">
              <label>{t('theme_color')}</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{ padding: '4px', height: '40px' }}
              />
            </div>

            <div className="field">
              <label>📺 {t('tournament_name') || 'Tournament name (TV Display)'} <span className="muted">({t('optional') || 'optionnel'})</span></label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Ex: Juby Club Winter Cup 2026"
              />
            </div>
          </div>

          {/* Communication Bot config group */}
          <div className="settings-section">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '14px' }}>
              📱 {t('telegram_section')}
            </h3>

            <div className="field">
              <label>{t('telegram_token')}</label>
              <input 
                type="password" 
                value={telegramBotToken} 
                onChange={(e) => setTelegramBotToken(e.target.value)} 
                placeholder="botXXXXXXXX:YYYYYYYYYY"
              />
            </div>

            <label className="staff-toggle" style={{ border: 'none', padding: '6px 0' }}>
              <input 
                type="checkbox" 
                checked={telegramAutoSend} 
                onChange={(e) => setTelegramAutoSend(e.target.checked)} 
                style={{ width: 'auto', marginRight: '8px' }}
              />
              <span>{t('telegram_auto_send')}</span>
            </label>
          </div>

          {/* Webhook API settings group */}
          <div className="settings-section">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '14px' }}>
              🌐 SMS API Gateway
            </h3>

            <label className="staff-toggle" style={{ border: 'none', padding: '6px 0', marginBottom: '10px' }}>
              <input 
                type="checkbox" 
                checked={smsApiEnabled} 
                onChange={(e) => setSmsApiEnabled(e.target.checked)} 
                style={{ width: 'auto', marginRight: '8px' }}
              />
              <span>Activer l'envoi d'SMS</span>
            </label>

            <div className="field">
              <label>{t('api_url') || 'Base URL'}</label>
              <input 
                type="text" 
                value={smsApiBaseUrl} 
                onChange={(e) => setSmsApiBaseUrl(e.target.value)} 
                placeholder="6zyv1d.api.infobip.com"
              />
            </div>

            <div className="field">
              <label>API Auth Token / Key</label>
              <input 
                type="password" 
                value={smsApiKey} 
                onChange={(e) => setSmsApiKey(e.target.value)} 
              />
            </div>

            <div className="field">
              <label>Sender ID</label>
              <input 
                type="text" 
                value={smsApiSender} 
                onChange={(e) => setSmsApiSender(e.target.value)} 
              />
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '22px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary btn-lg" style={{ minWidth: '150px' }}>
            💾 {t('save_settings')}
          </button>
          
          <button 
            type="button" 
            className="btn btn-lg" 
            onClick={handleExportBackup}
          >
            📥 Export Backup (JSON)
          </button>

          <label className="btn btn-lg" style={{ cursor: 'pointer', margin: 0 }}>
            📤 Import Backup
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportBackup} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </form>
    </div>
  );
}
