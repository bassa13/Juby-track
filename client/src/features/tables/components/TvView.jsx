import React, { useState, useEffect } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';
import { fullName } from '../../../core/utils/timeUtils.js';

export function TvView() {
  const { t } = useTranslation();
  const tables = useJubyStore((state) => state.tables);
  const games = useJubyStore((state) => state.games);
  const players = useJubyStore((state) => state.players);
  const settings = useJubyStore((state) => state.settings);

  // Parse URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tvTableParam = urlParams.get('tv');
  const tvNum = urlParams.get('n') || '';
  const isOBS = urlParams.get('obs') === '1';

  const [now, setNow] = useState(() => Date.now());

  // Resolve table: it can be full ID or short TV code
  const resolveTable = () => {
    if (!tvTableParam) return null;
    // Check match by ID or check if table label matches
    let found = tables.find(tbl => tbl.id === tvTableParam);
    if (!found) {
      // Fallback matching by label substring (e.g. "P1" or "SN")
      found = tables.find(tbl => tbl.id.toLowerCase().includes(tvTableParam.toLowerCase()) || tbl.label.toLowerCase().includes(tvTableParam.toLowerCase()));
    }
    return found;
  };

  const table = resolveTable();
  const activeGame = table ? games.find(g => g.tableId === table.id && !g.endTime) : null;

  // Live timer update
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // In case table is not found
  if (!table) {
    return (
      <div style={{
        background: '#0a0e14', color: '#8b97a8', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontFamily: 'monospace'
      }}>
        📺 TV {tvNum || '?'} — Table not found
      </div>
    );
  }

  // Snooker TV defaults
  const snTheme = settings.tvTheme?.snooker || {
    bgColor: '#051105', // dark green snooker felt theme
    typeLabelColor: '#2ecc71',
    tableLabelColor: '#d4af37',
    inactiveNameColor: '#8b97a8',
    activeNameColor: '#ffffff',
    activeBorderColor: '#2ecc71',
    timerColor: '#2ecc71',
    framesScoreColor: '#ffffff',
    rowLabelColor: '#8b97a8',
    scoreColor: '#f1c40f',
    breakLabelColor: '#d4af37',
    breakYellowColor: '#f1c40f',
    breakBrownColor: '#e67e22',
    breakHistoryColor: '#8b97a8',
    rowDividerColor: 'rgba(255,255,255,0.08)',
    queueBgColor: 'rgba(0,0,0,0.4)',
    queueLabelColor: '#d4af37',
    queueNextColor: '#2ecc71',
    queueRestColor: '#8b97a8',
    showQueue: true,
    showScoreRow: true,
    showBreakRow: true,
    titleSize: 56,
    playerNameSize: 28,
    bigNumberSize: 100,
    labelSize: 22
  };

  // OBS theme defaults
  const obsTheme = settings.tvTheme?.obs || {
    bgColor: '#1a1a1a',
    bgOpacity: 0.85,
    textColor: '#ffffff',
    accentScoreColor: '#d4af37',
    gradientColor1: '#d4af37',
    gradientColor2: '#2ecc71',
    gradientColor3: '#3498db',
    gradientAnimate: true,
    width: 80,
    playerNameSize: 24,
    scoreSize: 56,
    subSize: 16,
    position: 'top',
    showSubBanner: true,
    showMiddleNumber: false
  };

  // Standard TV defaults
  const tvTheme = settings.tvTheme || {
    bgColor: '#0a0e14',
    accentColor: '#d4af37',
    fontFamily: 'sans',
    showStars: true
  };

  const getPlayerObject = (id) => players.find(p => p.id === id);

  // Time calculations
  let durationText = '00:00:00';
  if (activeGame && activeGame.startTime) {
    const elapsed = Math.max(0, Math.floor((now - activeGame.startTime) / 1000));
    const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    durationText = `${hh}:${mm}:${ss}`;
  }

  // ================= RENDER OBS OVERLAY =================
  if (isOBS) {
    const p1 = activeGame && activeGame.players[0] ? getPlayerObject(activeGame.players[0]) : null;
    const p2 = activeGame && activeGame.players[1] ? getPlayerObject(activeGame.players[1]) : null;

    const p1Name = p1 ? fullName(p1).toUpperCase() : 'PLAYER 1';
    const p2Name = p2 ? fullName(p2).toUpperCase() : 'PLAYER 2';

    const s1 = activeGame ? (activeGame.type === 'snooker' ? (activeGame.frameWins?.[activeGame.players[0]] || 0) : (activeGame.score?.[activeGame.players[0]] || 0)) : 0;
    const s2 = activeGame && activeGame.players[1] ? (activeGame.type === 'snooker' ? (activeGame.frameWins?.[activeGame.players[1]] || 0) : (activeGame.score?.[activeGame.players[1]] || 0)) : 0;

    const target = activeGame && activeGame.type === '8ball' && activeGame.jetons ? `RACE TO ${activeGame.jetons}` : '';

    const subPieces = [];
    if (target) subPieces.push(target);
    subPieces.push(durationText);

    const positionStyle = obsTheme.position === 'bottom' 
      ? { bottom: '24px', top: 'auto', left: '50%', transform: 'translateX(-50%)' } 
      : obsTheme.position === 'center' 
      ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } 
      : { top: '24px', left: '50%', transform: 'translateX(-50%)' };

    const gradStyle = `linear-gradient(90deg, ${obsTheme.gradientColor1} 0%, ${obsTheme.gradientColor2} 50%, ${obsTheme.gradientColor3} 100%)`;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000, background: 'transparent', color: obsTheme.textColor, overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', width: `${obsTheme.width}%`, maxWidth: '1600px', ...positionStyle
        }}>
          <div className={`obs-banner ${obsTheme.gradientAnimate ? 'animate' : ''}`} style={{ background: gradStyle, padding: '3px', borderRadius: '8px', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
            <div className="obs-banner-inner" style={{ background: `rgba(26,26,26,${obsTheme.bgOpacity})`, borderRadius: '6px', padding: '14px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: `${obsTheme.playerNameSize}px`, fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p1Name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '18px', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: `${obsTheme.scoreSize}px`, fontWeight: '900', color: obsTheme.accentScoreColor }}>{s1}</span>
                <span style={{ fontSize: `${obsTheme.scoreSize}px`, fontWeight: '900', color: obsTheme.accentScoreColor }}>{s2}</span>
              </span>
              <span style={{ fontSize: `${obsTheme.playerNameSize}px`, fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', flex: 1, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p2Name}</span>
            </div>
          </div>
          {obsTheme.showSubBanner && (
            <div className={`obs-sub ${obsTheme.gradientAnimate ? 'animate' : ''}`} style={{ background: gradStyle, margin: '6px auto 0', maxWidth: '60%', padding: '3px', borderRadius: '8px' }}>
              <div className="obs-sub-inner" style={{ background: `rgba(26,26,26,${obsTheme.bgOpacity})`, borderRadius: '6px', padding: '6px 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', fontSize: `${obsTheme.subSize}px`, fontWeight: '700' }}>
                {subPieces.map((p, i) => (
                  <React.Fragment key={i}>
                    <span>{p}</span>
                    {i < subPieces.length - 1 && <span style={{ opacity: 0.6 }}>●</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= RENDER SNOOKER LAYOUT =================
  if (table.type === 'snooker') {
    const p1 = activeGame && activeGame.players[0] ? getPlayerObject(activeGame.players[0]) : null;
    const p2 = activeGame && activeGame.players[1] ? getPlayerObject(activeGame.players[1]) : null;

    const p1Name = p1 ? fullName(p1).toUpperCase() : 'PLAYER 1';
    const p2Name = p2 ? fullName(p2).toUpperCase() : 'PLAYER 2';

    const f1 = activeGame ? (activeGame.frameWins?.[activeGame.players[0]] || 0) : 0;
    const f2 = activeGame && activeGame.players[1] ? (activeGame.frameWins?.[activeGame.players[1]] || 0) : 0;

    const s1 = activeGame ? (activeGame.score?.[activeGame.players[0]] || 0) : 0;
    const s2 = activeGame && activeGame.players[1] ? (activeGame.score?.[activeGame.players[1]] || 0) : 0;

    const queue = (table.queue || []).map(entry => {
      const p = getPlayerObject(entry.p1);
      return p ? fullName(p).toUpperCase() : null;
    }).filter(Boolean);

    if (!activeGame) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, background: snTheme.bgColor, color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '5vh 5vw', fontFamily: 'sans-serif'
        }}>
          <div style={{ fontSize: '1.5vw', letterSpacing: '4px', color: snTheme.typeLabelColor, textTransform: 'uppercase', marginBottom: '16px' }}>🎯 SNOOKER · TV {tvNum}</div>
          <div style={{ fontSize: '8vw', fontWeight: '900', color: snTheme.tableLabelColor, letterSpacing: '8px', marginBottom: '24px' }}>{(table.label || 'TABLE').toUpperCase()}</div>
          <div style={{ fontSize: '2.5vw', color: snTheme.inactiveNameColor, letterSpacing: '3px', textTransform: 'uppercase' }}>{t('tv_no_active_match') || 'Aucun match actif'}</div>
        </div>
      );
    }

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000, background: snTheme.bgColor, color: '#ffffff', overflow: 'hidden', padding: 0, fontFamily: 'sans-serif'
      }}>
        {/* Top-left cosmetics */}
        <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ width: '36px', height: '36px', border: `1px solid ${snTheme.inactiveNameColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: snTheme.inactiveNameColor, fontSize: '18px' }}>×</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: snTheme.typeLabelColor, letterSpacing: '3px' }}>SNOOKER</div>
        </div>

        {/* Queue Display */}
        {snTheme.showQueue && queue.length > 0 && (
          <div style={{ position: 'absolute', top: '24px', right: '24px', background: snTheme.queueBgColor, border: `1px solid ${snTheme.rowDividerColor}`, borderRadius: '8px', padding: '12px 20px', minWidth: '220px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: snTheme.queueLabelColor, letterSpacing: '2px', textAlign: 'center', paddingBottom: '6px', borderBottom: `1px solid ${snTheme.queueLabelColor}`, marginBottom: '8px', textTransform: 'uppercase' }}>FILE D'ATTENTE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              {queue.map((name, idx) => (
                <div key={idx} style={{ fontSize: '14px', fontWeight: '600', color: idx === 0 ? snTheme.queueNextColor : snTheme.queueRestColor }}>{name}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 80px 32px' }}>
          {/* Table name */}
          <div style={{ textAlign: 'center', padding: '40px 0 18px' }}>
            <div style={{ fontSize: `${snTheme.titleSize}px`, fontWeight: '900', color: snTheme.tableLabelColor, letterSpacing: '6px' }}>{(table.label || 'TABLE').toUpperCase()}</div>
          </div>

          {/* Names row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${snTheme.rowDividerColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 24px', border: `3px solid ${snTheme.activeBorderColor}`, borderRadius: '6px' }}>
                <span style={{ fontSize: `${snTheme.playerNameSize}px`, fontWeight: '700', color: snTheme.activeNameColor, letterSpacing: '2px' }}>{p1Name}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: '700', color: snTheme.timerColor, letterSpacing: '3px' }}>{durationText}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, justifyContent: 'flex-end' }}>
              <div style={{ padding: '10px 24px', border: '3px solid transparent', borderRadius: '6px' }}>
                <span style={{ fontSize: `${snTheme.playerNameSize}px`, fontWeight: '700', color: snTheme.inactiveNameColor, letterSpacing: '2px' }}>{p2Name}</span>
              </div>
            </div>
          </div>

          {/* Frames row */}
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, borderBottom: `1px solid ${snTheme.rowDividerColor}`, padding: '20px 0' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: `${snTheme.bigNumberSize}px`, fontWeight: '900', color: snTheme.framesScoreColor }}>{f1}</span>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: `${snTheme.labelSize}px`, fontWeight: '700', color: snTheme.rowLabelColor, letterSpacing: '4px' }}>FRAMES</div>
              <div style={{ fontSize: '12px', color: snTheme.inactiveNameColor, marginTop: '4px' }}>({f1 + f2})</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: `${snTheme.bigNumberSize}px`, fontWeight: '900', color: snTheme.framesScoreColor }}>{f2}</span>
            </div>
          </div>

          {/* score row */}
          {snTheme.showScoreRow && (
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, borderBottom: `1px solid ${snTheme.rowDividerColor}`, padding: '20px 0' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: `${snTheme.bigNumberSize}px`, fontWeight: '900', color: snTheme.scoreColor }}>{s1}</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: `${snTheme.labelSize}px`, fontWeight: '700', color: snTheme.rowLabelColor, letterSpacing: '4px' }}>SCORE</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: `${snTheme.bigNumberSize}px`, fontWeight: '900', color: snTheme.scoreColor }}>{s2}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= RENDER STANDARD POOL LAYOUT =================
  const p1 = activeGame && activeGame.players[0] ? getPlayerObject(activeGame.players[0]) : null;
  const p2 = activeGame && activeGame.players[1] ? getPlayerObject(activeGame.players[1]) : null;

  const p1Name = p1 ? fullName(p1).toUpperCase() : 'PLAYER 1';
  const p2Name = p2 ? fullName(p2).toUpperCase() : 'PLAYER 2';

  const s1 = activeGame ? (activeGame.score?.[activeGame.players[0]] || 0) : 0;
  const s2 = activeGame && activeGame.players[1] ? (activeGame.score?.[activeGame.players[1]] || 0) : 0;

  const bgStyle = `radial-gradient(ellipse at center, ${tvTheme.bgColor || '#0a0e2e'} 0%, #000 100%)`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: bgStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4vh 6vw', color: '#ffffff', fontFamily: 'sans-serif'
    }}>
      {tvTheme.showStars && (
        <>
          <div className="tv-stars-deep"></div>
          <div className="tv-stars-layer"></div>
        </>
      )}

      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        {/* Table Label */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: '900', color: tvTheme.accentColor, letterSpacing: '4px', textTransform: 'uppercase' }}>
            {table.label}
          </div>
          <div style={{ fontSize: '14px', color: '#8b97a8', letterSpacing: '2px', marginTop: '6px', textTransform: 'uppercase' }}>
            {activeGame ? (activeGame.type === '8ball' ? `Pool 8-Ball · ${activeGame.level}` : 'PlayStation') : 'Table Libre'}
          </div>
        </div>

        {/* Big Scoreboard Grid */}
        {activeGame ? (
          <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', gap: '30px', margin: '40px 0' }}>
            {/* Player 1 Card */}
            <div style={{ flex: 1, textAlign: 'right', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 40px', borderRadius: '16px' }}>
              <div style={{ fontSize: 'clamp(20px, 3vw, 42px)', fontWeight: '800', color: '#ffffff', letterSpacing: '1px', marginBottom: '8px' }}>{p1Name}</div>
              <div style={{ fontSize: 'clamp(80px, 12vw, 180px)', fontWeight: '900', color: tvTheme.accentColor, lineHeight: 1 }}>{s1}</div>
            </div>

            {/* Separator / Timer */}
            <div style={{ textAlign: 'center', minWidth: '150px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ecc71', fontVariantNumeric: 'tabular-nums', letterSpacing: '1px' }}>{durationText}</div>
              {activeGame.jetons > 0 && (
                <div style={{ fontSize: '13px', color: '#8b97a8', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Race to {activeGame.jetons}</div>
              )}
            </div>

            {/* Player 2 Card */}
            {p2 ? (
              <div style={{ flex: 1, textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 40px', borderRadius: '16px' }}>
                <div style={{ fontSize: 'clamp(20px, 3vw, 42px)', fontWeight: '800', color: '#ffffff', letterSpacing: '1px', marginBottom: '8px' }}>{p2Name}</div>
                <div style={{ fontSize: 'clamp(80px, 12vw, 180px)', fontWeight: '900', color: tvTheme.accentColor, lineHeight: 1 }}>{s2}</div>
              </div>
            ) : (
              <div style={{ flex: 1, textAlign: 'left', padding: '24px 40px' }}>
                <div style={{ fontSize: '24px', color: '#8b97a8' }}>Seul joueur</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
            <div style={{ fontSize: '96px', opacity: 0.1 }}>🎱</div>
            <div style={{ fontSize: '28px', color: '#8b97a8', fontWeight: 'bold', marginTop: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>Table Libre</div>
          </div>
        )}

        {/* Footer info */}
        <div style={{ textAlign: 'center', color: '#5d6979', fontSize: '12px', letterSpacing: '1px' }}>
          Juby Club Scoreboard System · {new Date(now).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
