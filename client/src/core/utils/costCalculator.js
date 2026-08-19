export function getSnookerRateAt(ts, settings) {
  const h = new Date(ts).getHours();
  const ds = settings?.snookerDayStart ?? 8;
  const de = settings?.snookerDayEnd ?? 16;
  if (h >= ds && h < de) return settings?.snookerDayRate ?? 15;
  return settings?.snookerNightRate ?? 20;
}

export function getCurrentSnookerRate(settings) {
  return getSnookerRateAt(Date.now(), settings);
}

export function compute8BallRaw(g, settings) {
  return g.jetons * (settings?.jetonPrice ?? 5);
}

export function compute8BallDiscount(raw, settings) {
  const thr = settings?.discountThreshold ?? 50;
  const pct = settings?.discountPercent ?? 10;
  if (raw >= thr && pct > 0) {
    const disc = raw * (pct / 100);
    // Round to nearest 5dh
    return Math.round(disc / 5) * 5;
  }
  return 0;
}

export function computeGameRaw(g, settings, tables) {
  if (g.type === '8ball') return compute8BallRaw(g, settings);
  if (g.type === 'snooker') return g.startTime ? getSnookerRateAt(g.startTime, settings) : getCurrentSnookerRate(settings);
  if (g.type === 'playstation') {
    const tab = tables?.find(t => t.id === g.tableId);
    if (!tab) return 0;
    if (tab.billingMode === 'perGame') return tab.rate || 0;
    // perHour: time elapsed * rate
    const end = g.endTime || Date.now();
    const hours = Math.max(0, (end - g.startTime) / 3600000);
    return hours * (tab.rate || 0);
  }
  return 0;
}

export function computeGameCost(g, settings, tables) {
  let raw = computeGameRaw(g, settings, tables);
  // Auto discount only on 8-ball
  if (g.type === '8ball') raw -= compute8BallDiscount(raw, settings);
  // Manual discount (dh)
  const manual = +g.manualDiscount || 0;
  return Math.max(0, raw - manual);
}

export function gameDiscount(g, settings) {
  if (g.type !== '8ball') return 0;
  return compute8BallDiscount(compute8BallRaw(g, settings), settings);
}

export function isStaffClient(playerId, players) {
  const p = players?.find(x => x.id === playerId);
  return p && p.isStaff === true;
}

export function computeCharges(game, winnerId, settings, tables, players) {
  const cost = computeGameCost(game, settings, tables);
  const charges = {};
  game.players.forEach(p => charges[p] = 0);
  if (game.players.length === 1) {
    charges[game.players[0]] = cost;
  } else if (game.splitMode === 'single') {
    charges[game.players[0]] = cost;
  } else if (game.splitMode === 'loser' && winnerId) {
    const loser = game.players.find(p => p !== winnerId);
    if (loser) charges[loser] = cost;
  } else {
    const each = cost / game.players.length;
    game.players.forEach(p => charges[p] = each);
  }
  
  // Track staff jetons separately (they play free but we count jetons)
  game.staffJetons = {};
  game.players.forEach(p => {
    if (isStaffClient(p, players)) {
      game.staffJetons[p] = charges[p];
      charges[p] = 0;
    }
  });
  return charges;
}
