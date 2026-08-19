import { computeCharges } from './costCalculator.js';

export function getPlayerStats(playerId, state, staffFilter = null) {
  const gamesList = state?.games || [];
  const paymentsList = state?.payments || [];
  const games = gamesList.filter(g => g.endTime && g.players.includes(playerId));
  const payments = paymentsList.filter(p => p.playerId === playerId);

  const filteredGames = staffFilter ? games.filter(g => g.staffId === staffFilter) : games;
  const filteredPayments = staffFilter ? payments.filter(p => p.staffId === staffFilter) : payments;

  let totalCharged = 0;
  let gamesPlayed = filteredGames.length;
  let gamesWon = 0;

  filteredGames.forEach(g => {
    const charges = g.charges || computeCharges(g, state?.settings, state?.tables);
    totalCharged += charges[playerId] || 0;
    if (g.winnerId === playerId) {
      gamesWon++;
    }
  });

  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  const netBalance = totalCharged - totalPaid;
  const balance = Math.max(0, netBalance);
  const credit = netBalance < 0 ? Math.abs(netBalance) : 0;
  const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

  return {
    gamesPlayed,
    gamesWon,
    winRate,
    totalCharged,
    totalPaid,
    balance,
    credit
  };
}

export function getGamePaidStatus(gameId, playerId, state) {
  let pid = playerId;
  let st = state;
  if (typeof playerId === 'object' && playerId !== null && !state) {
    st = playerId;
    pid = null;
  }

  const gamesList = st?.games || [];
  const paymentsList = st?.payments || [];
  const game = gamesList.find(g => g.id === gameId);
  if (!game || !game.endTime) return { status: 'unpaid', paid: 0, total: 0 };

  const charges = game.charges || computeCharges(game, st?.settings, st?.tables);
  const totalCharge = pid ? (charges[pid] || 0) : Object.values(charges || {}).reduce((a, b) => a + b, 0);
  if (totalCharge <= 0) return { status: 'free', paid: 0, total: 0 };

  const targetPids = pid ? [pid] : (game.players || []);
  let totalCovered = 0;

  targetPids.forEach(pId => {
    const playerGames = gamesList
      .filter(g => g.endTime && g.players.includes(pId))
      .sort((a, b) => a.endTime - b.endTime);
    
    const totalPaid = paymentsList.filter(p => p.playerId === pId).reduce((s, p) => s + p.amount, 0);
    let remaining = totalPaid;
    
    for (const g of playerGames) {
      const c = (g.charges || {})[pId] || 0;
      if (g.id === gameId) {
        totalCovered += Math.min(remaining, c);
        break;
      }
      remaining -= c;
      if (remaining <= 0) {
        break;
      }
    }
  });
  
  if (totalCovered >= totalCharge - 0.01) return { status: 'paid', paid: totalCharge, total: totalCharge };
  if (totalCovered > 0) return { status: 'partial', paid: totalCovered, total: totalCharge };
  return { status: 'unpaid', paid: 0, total: totalCharge };
}
