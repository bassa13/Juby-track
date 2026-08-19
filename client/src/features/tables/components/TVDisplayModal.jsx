import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';

export function TVDisplayModal() {
  const { t } = useTranslation();
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const tables = useJubyStore((state) => state.tables);
  const setTableTvEnabled = useJubyStore((state) => state.setTableTvEnabled);

  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const table = pendingAction?.type === 'tvDisplay' ? tables.find((t) => t.id === pendingAction.tableId) : null;

  const tvUrl = table ? `${window.location.origin}/tv/snooker/${encodeURIComponent(table.id)}` : '';

  useEffect(() => {
    if (!table) return;
    let cancelled = false;
    QRCode.toDataURL(tvUrl, { margin: 1, width: 220, color: { dark: '#0a0e14', light: '#ffffff' } })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [table, tvUrl]);

  if (!table) return null;

  const handleClose = () => setPendingAction(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tvUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', tvUrl);
    }
  };

  const handleOpen = () => window.open(tvUrl, '_blank', 'noopener,noreferrer');

  const tvEnabled = table.tvEnabled !== false;

  return (
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>📺 TV Display — {table.label}</h3>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>{t('tv_link') || 'TV link for this table'}</label>
            <div className="row gap-sm" style={{ display: 'flex', gap: '8px' }}>
              <input type="text" readOnly value={tvUrl} onFocus={(e) => e.target.select()} style={{ flex: 1, fontSize: '12px' }} />
              <button type="button" className="btn btn-sm" onClick={handleCopy}>{copied ? '✅' : '📋'}</button>
            </div>
          </div>

          {qrDataUrl && (
            <div style={{ textAlign: 'center', margin: '14px 0' }}>
              <img src={qrDataUrl} alt="TV link QR code" width={180} height={180} style={{ borderRadius: '10px', background: '#fff', padding: '8px' }} />
              <div className="muted" style={{ fontSize: '11px', marginTop: '6px' }}>Scan to open on a phone/tablet</div>
            </div>
          )}

          <div className="field" style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ margin: 0 }}>{t('tv_mode_enabled') || 'TV Display enabled'}</label>
            <input
              type="checkbox"
              checked={tvEnabled}
              onChange={(e) => setTableTvEnabled(table.id, e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
          </div>
          {!tvEnabled && (
            <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
              The TV page will show a "disabled" message for this table until re-enabled.
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={handleOpen}>🖥️ {t('open_tv_display') || 'Open TV Display'}</button>
          <button type="button" className="btn btn-primary" onClick={handleOpen}>⛶ {t('fullscreen') || 'Fullscreen'}</button>
        </div>
      </div>
    </div>
  );
}
