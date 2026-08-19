// Manual verification that the local (no-Supabase) BroadcastChannel fallback
// actually delivers actions between two independent tabs and ignores
// self-echoes. Run with: npx vite-node src/features/tv/__selftest_broadcast.ts
// (plain tsx won't work here since supabaseClient.js reads import.meta.env,
// which only vite-node emulates outside an actual Vite dev/build run).
//
// Note: within a single Node process, connectLiveFrameChannel's module-level
// `senderId` is one shared value (unlike two real browser tabs, which each
// get their own JS realm and thus their own randomUUID()). So "tabA" below
// is simulated with a raw BroadcastChannel using an explicit, different
// senderId, to actually exercise cross-tab delivery rather than accidentally
// tripping the self-echo filter against itself.
import { connectLiveFrameChannel } from './liveFrameChannel.ts';
import type { LiveFrameAction, BroadcastEnvelope } from './types.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('ok - ' + msg);
}

async function main() {
  const tabBReceived: LiveFrameAction[] = [];
  const tabB = connectLiveFrameChannel('SN', {
    onAction: (a) => tabBReceived.push(a),
    onStatusChange: (s) => console.log('tabB status:', s),
  });

  await new Promise((r) => setTimeout(r, 50));

  // Simulate a genuinely separate tab ("tabA") publishing to the same
  // per-table channel with its own distinct sender id.
  const externalTabA = new BroadcastChannel('tv:SN');
  const envelope: BroadcastEnvelope = { action: { type: 'NEXT_PLAYER' }, senderId: 'external-tab-A', sentAt: Date.now() };
  externalTabA.postMessage(envelope);

  await new Promise((r) => setTimeout(r, 50));
  assert(tabBReceived.length === 1 && tabBReceived[0].type === 'NEXT_PLAYER', 'tabB received the action published by a distinct external tab');

  // Now verify self-echo suppression: tabB publishing should NOT trigger its own onAction.
  tabB.publish({ type: 'POT_RED' });
  await new Promise((r) => setTimeout(r, 50));
  assert(tabBReceived.length === 1, 'tabB did not receive its own echo after publishing POT_RED');

  // And a second external listener should see that POT_RED as a normal cross-tab delivery.
  const externalReceived: LiveFrameAction[] = [];
  externalTabA.onmessage = (event) => {
    const env = event.data as BroadcastEnvelope;
    externalReceived.push(env.action);
  };
  tabB.publish({ type: 'TIMER_TOGGLE' });
  await new Promise((r) => setTimeout(r, 50));
  assert(externalReceived.length === 1 && externalReceived[0].type === 'TIMER_TOGGLE', 'a third listener on the same channel receives tabB\'s publish');

  tabB.unsubscribe();
  externalTabA.close();

  console.log('\nAll local BroadcastChannel fallback checks passed.');
}

main().catch((err) => {
  console.error(err);
  throw err;
});
