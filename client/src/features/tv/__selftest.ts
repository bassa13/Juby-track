// Throwaway manual verification script for the snooker engine — not part of
// the app bundle. Run with: npx tsx src/features/tv/__selftest.ts
import { applyAction, createInitialFrame, computeRemainingPoints } from './snookerEngine.ts';
import type { LiveFrameState } from './types.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('ok - ' + msg);
}

let s: LiveFrameState = createInitialFrame({
  tableId: 'SN',
  gameId: 'g1',
  players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
});

// Alice pots a red then black, building a break of 8.
s = applyAction(s, { type: 'POT_RED' });
assert(s.redsRemaining === 14, 'red potted decrements redsRemaining to 14');
assert(s.scores[0] === 1, 'Alice score is 1 after potting a red');
assert(s.onColor === true, 'onColor true right after a red');

s = applyAction(s, { type: 'POT_COLOR', color: 'black' });
assert(s.scores[0] === 8, 'Alice score is 8 after red+black');
assert(s.redsRemaining === 14, 'reds unaffected by colour pot');
assert(s.onColor === false, 'back to needing a red');
assert(s.currentBreak.value === 8, 'break of 8 recorded');

// Illegal action: trying to pot a colour while a red is expected should be a no-op.
const before = s;
s = applyAction(s, { type: 'POT_COLOR', color: 'pink' });
assert(s === before, 'illegal colour pot while on a red is rejected (no-op)');

// Switch player, which should bank the break into highestBreak.
s = applyAction(s, { type: 'NEXT_PLAYER' });
assert(s.highestBreak[0] === 8, 'highest break banked for Alice after turn change');
assert(s.activePlayerIndex === 1, 'active player is now Bob');
assert(s.currentBreak.value === 0, 'break reset after turn change');

// Undo should restore the exact prior snapshot.
s = applyAction(s, { type: 'UNDO' });
assert(s.activePlayerIndex === 0, 'undo restored active player to Alice');
assert(s.highestBreak[0] === 0, 'undo restored highest break');

// Clear out all 15 reds + their follow colours quickly to reach the colours phase.
s = createInitialFrame({ tableId: 'SN', gameId: 'g1', players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }] });
for (let i = 0; i < 15; i++) {
  s = applyAction(s, { type: 'POT_RED' });
  s = applyAction(s, { type: 'POT_COLOR', color: 'black' });
}
assert(s.redsRemaining === 0, 'all reds cleared');
assert(s.phase === 'colors', 'moved into the colours phase after the last red+colour');
assert(s.scores[0] === 15 * 8, 'Alice has potted every red+black (120 points)');

// Now pot the colours in strict order.
const order: Array<'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black'> = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
for (const c of order.slice(0, 5)) {
  s = applyAction(s, { type: 'POT_COLOR', color: c });
}
assert(s.phase === 'colors', 'still in colours phase before black');
assert(s.scores[0] === 120 + 2 + 3 + 4 + 5 + 6, 'score after yellow..pink potted');

// Out-of-order colour attempt should be rejected.
const beforeBlackAttempt = s;
s = applyAction(s, { type: 'POT_COLOR', color: 'yellow' });
assert(s === beforeBlackAttempt, 'cannot pot yellow again out of order');

// Pot the final black — Alice has all the points, should win outright (no tie).
s = applyAction(s, { type: 'POT_COLOR', color: 'black' });
assert(s.phase === 'finished', 'frame finished after final black');
assert(s.winnerIndex === 0, 'Alice declared winner');

// --- Remaining points / snookers-required sanity check ---
let t = createInitialFrame({ tableId: 'SN', gameId: 'g2', players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] });
// Drain all but 1 red (and its colours) so remainingPoints is small, give Bob a big lead.
for (let i = 0; i < 14; i++) {
  t = applyAction(t, { type: 'POT_RED' });
  t = applyAction(t, { type: 'POT_COLOR', color: 'black' });
}
// Bob is far ahead manually for the test.
t = { ...t, scores: [0, 100] };
const info = computeRemainingPoints(t);
assert(info.remainingPoints === 1 * 8 + 27, 'remaining points = 1 red*8 + colours(27) = 35');
assert(info.needsSnookers === true, 'trailing player (Alice) needs snookers when 100-0 with only 35 left');
assert(info.trailingPlayerIndex === 0, 'Alice is trailing');
console.log('snookersRequired estimate:', info.snookersRequired);

// --- RESTORE_RED (miscount correction, score/break untouched) ---
let r = createInitialFrame({ tableId: 'SN', gameId: 'g3', players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] });
r = applyAction(r, { type: 'POT_RED' });
r = applyAction(r, { type: 'POT_COLOR', color: 'black' });
assert(r.redsRemaining === 14 && r.scores[0] === 8, 'baseline: 1 red+black potted, 14 left, score 8');
r = applyAction(r, { type: 'RESTORE_RED' });
assert(r.redsRemaining === 15, 'RESTORE_RED gives a red ball back (15)');
assert(r.scores[0] === 8, 'RESTORE_RED does not touch the score');
r = applyAction(r, { type: 'RESTORE_RED' });
assert(r.redsRemaining === 15, 'RESTORE_RED is a no-op once already at 15 (cannot exceed max)');
// Once in the colours phase, restoring a red should be rejected (no-op).
let r2 = createInitialFrame({ tableId: 'SN', gameId: 'g4', players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] });
for (let i = 0; i < 15; i++) {
  r2 = applyAction(r2, { type: 'POT_RED' });
  r2 = applyAction(r2, { type: 'POT_COLOR', color: 'black' });
}
assert(r2.phase === 'colors', 'baseline: now in colours phase');
const beforeRestoreInColors = r2;
r2 = applyAction(r2, { type: 'RESTORE_RED' });
assert(r2 === beforeRestoreInColors, 'RESTORE_RED rejected once reds phase is over');

console.log('\nAll snooker engine self-checks passed.');
