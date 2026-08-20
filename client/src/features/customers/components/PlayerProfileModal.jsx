import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { getPlayerStats } from '../../../core/utils/customerLedger.js';
import { fullName, initials, fmt, isBirthdayToday, hoursUntilBirthday, ageFromBirthdate, fmtDate } from '../../../core/utils/timeUtils.js';

export function PlayerProfileModal({ playerId, onClose, onOpenPay, onOpenSMS, onOpenAdvance, onEditPlayer }) {
  const { t, lang } = useTranslation();
  
  const players = useJubyStore((state) => state.players);
  const games = useJubyStore((state) => state.games);
  const payments = useJubyStore((state) => state.payments);
  const currentUser = useJubyStore((state) => state.currentUser);
  const tables = useJubyStore((state) => state.tables);

  const player = players.find(p => p.id === playerId);
  if (!player) return null;

  const isAdmin = currentUser?.role === 'admin';
  const staffFilter = isAdmin ? null : currentUser?.id;

  // Retrieve player stats
  const stats = getPlayerStats(playerId, { players, games, payments }, staffFilter);

  // Retrieve history logs (filtered by role relationship if not admin)
  let playerGames = games.filter(g => g.endTime && g.players.includes(playerId));
  let playerPayments = payments.filter(pay => pay.playerId === playerId);

  if (!isAdmin) {
    playerGames = playerGames.filter(g => g.staffId === currentUser.id);
    playerPayments = playerPayments.filter(pay => pay.staffId === currentUser.id);
  }

  // Sort history logs by descending date
  playerGames = [...playerGames].sort((a, b) => b.endTime - a.endTime);
  playerPayments = [...playerPayments].sort((a, b) => b.date - a.date);

  const age = ageFromBirthdate(player.birthdate);
  const isBday = isBirthdayToday(player.birthdate);
  const hoursToBday = player.birthdate ? hoursUntilBirthday(player.birthdate) : null;

  const getTableName = (tid) => {
    const tab = tables.find(t => t.id === tid);
    return tab ? tab.label : tid;
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>👤 {t('player_profile')}</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Header section with photo and basic info */}
          <div className="profile-head" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap' }}>
            <div className="player-avatar lg" style={{ background: 'linear-gradient(135deg, var(--accent), var(--green))', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px', overflow: 'hidden', flexShrink: 0 }}>
              {player.photo ? <img src={player.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(player)}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
                {fullName(player)}{isBday ? ' 🎉' : ''}
                {player.isStaff && <span className="client-staff-badge" style={{ marginLeft: '8px' }}>👔 STAFF</span>}
              </h2>
              <div className="profile-meta" style={{ display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                {player.phone && <span>📞 {player.phone}</span>}
                {player.birthdate && (
                  <span>
                    🎂 {new Date(player.birthdate).toLocaleDateString(lang === 'ar' ? 'ar-MA-u-nu-latn' : lang)}
                    {age !== null && ` · ${age} ${t('years')}`}
                    {isBday ? ` · (Birthday Today!)` : (hoursToBday !== null && hoursToBday <= 24 ? ` · (Birthday Tomorrow!)` : '')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '22px' }}>
            <div className="profile-stat" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div className="lbl" style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {t('spent') || 'Total dépensé'}
              </div>
              <div className="val" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
                {fmt(stats.totalCharged)} dh
              </div>
            </div>

            <div className="profile-stat" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div className="lbl" style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {t('paid_total') || 'Total payé'}
              </div>
              <div className="val" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--green)' }}>
                {fmt(stats.totalPaid)} dh
              </div>
            </div>

            {stats.balance > 0 ? (
              <div className="profile-stat gold" style={{ background: 'rgba(243,156,18,0.08)', border: '1px solid var(--warning)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div className="lbl" style={{ fontSize: '10px', color: 'var(--warning)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {t('debt') || 'Dette'}
                </div>
                <div className="val" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--warning)' }}>
                  {fmt(stats.balance)} dh
                </div>
              </div>
            ) : stats.credit > 0 ? (
              <div className="profile-stat" style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid var(--green)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div className="lbl" style={{ fontSize: '10px', color: 'var(--green)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {t('credit_balance') || 'Crédit'}
                </div>
                <div className="val" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--green)' }}>
                  +{fmt(stats.credit)} dh
                </div>
              </div>
            ) : (
              <div className="profile-stat" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div className="lbl" style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Balance
                </div>
                <div className="val" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--green)' }}>
                  ✓ Payé
                </div>
              </div>
            )}

            <div className="profile-stat" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div className="lbl" style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {t('winrate') || 'Taux victoire'}
              </div>
              <div className="val" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent)' }}>
                {stats.gamesPlayed ? `${Math.round(stats.winRate)}%` : '-'}
              </div>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="profile-actions" style={{ display: 'flex', gap: '8px', marginBottom: '22px', flexWrap: 'wrap' }}>
            {stats.balance > 0 && (
              <button 
                type="button" 
                className="btn btn-warning" 
                onClick={() => onOpenPay(playerId)}
                style={{ flex: 1 }}
              >
                💵 {t('pay_button')}
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-success" 
              onClick={() => onOpenAdvance(playerId)}
              style={{ flex: 1 }}
            >
              💰 + {t('advance_payment')}
            </button>
            {player.phone && (
              <button 
                type="button" 
                className="btn" 
                onClick={() => onOpenSMS(playerId)}
                style={{ flex: 1 }}
              >
                💬 SMS
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-info" 
              onClick={() => {
                onClose();
                if (onEditPlayer) onEditPlayer(playerId);
              }}
              style={{ flex: 1 }}
            >
              ✏️ {t('edit') || 'Modifier'}
            </button>
          </div>

          {/* History Lists */}
          <div className="profile-history-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Matches list */}
            <div>
              <h4 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-dim)' }}>
                🎮 {t('games') || 'Parties'} ({playerGames.length})
              </h4>
              {playerGames.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: '13px' }}>
                  {t('no_data')}
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {playerGames.map((g) => {
                    const isWin = g.winnerId === playerId;
                    const gameCost = g.charges[playerId] || 0;
                    return (
                      <div key={g.id} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <div>
                          <strong>{getTableName(g.tableId)}</strong>
                          <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '2px' }}>
                            {fmtDate(g.endTime, lang)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '700', color: gameCost > 0 ? 'var(--accent)' : 'var(--purple)' }}>
                            {gameCost > 0 ? `${fmt(gameCost)} dh` : 'Gratuit'}
                          </span>
                          {g.players.length > 1 && (
                            <div style={{ fontSize: '10px', marginTop: '2px', color: isWin ? 'var(--green)' : 'var(--danger)' }}>
                              {isWin ? '🏆 Win' : '❌ Lost'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payments list */}
            <div>
              <h4 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-dim)' }}>
                📜 {t('payments') || 'Paiements'} ({playerPayments.length})
              </h4>
              {playerPayments.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: '13px' }}>
                  {t('no_data')}
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {playerPayments.map((pay) => (
                    <div key={pay.id} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div>
                        <strong>{pay.note || t('pay_title')}</strong>
                        <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '2px' }}>
                          {fmtDate(pay.date, lang)}
                        </div>
                      </div>
                      <span style={{ fontWeight: '700', color: 'var(--green)', fontSize: '13px' }}>
                        +{fmt(pay.amount)} dh
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
