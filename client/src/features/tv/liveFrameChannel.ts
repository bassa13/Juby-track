// Realtime transport for the TV scoreboard.
//
// Design: every keypress/click is applied *locally and immediately* (via
// snookerEngine.applyAction) for a zero-latency feel, and the small action
// event — not the whole state — is broadcast over a per-table Supabase
// Realtime Broadcast channel ("tv:<tableId>"). Every other subscriber
// (the TV, or a control panel tab, or a second TV) applies the exact same
// pure reducer to the exact same event, so everyone converges on identical
// state without ever shipping a full-state JSON blob on the hot path.
// Broadcast messages are a plain WebSocket relay with no DB round-trip,
// which is what gets this comfortably under the ~100ms target.
//
// A debounced snapshot is *also* written to the `live_frames` table, purely
// so a page opened (or reloaded) mid-frame can rehydrate instead of showing
// zeros. That write is off the hot path and never blocks a broadcast.
//
// IMPORTANT ordering requirement (this is what broke live sync before):
// Supabase's realtime-js client only delivers events to listeners that were
// registered with `.on(...)` *before* `.subscribe()` is called. Listeners
// attached after subscribe can silently never fire. This module's public API
// is shaped so that's impossible to get wrong: the action/status callbacks
// are required constructor arguments, wired via `.on()` internally, and only
// then does it call `.subscribe()`.

import { supabase, isSupabaseConfigured } from '../../core/supabase/supabaseClient.js';
import type { LiveFrameAction, LiveFrameState, BroadcastEnvelope } from './types.ts';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const senderId: string =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random()}`;

function channelNameFor(tableId: string): string {
  return `tv:${tableId}`;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'unavailable' | 'local';

export interface LiveFrameChannel {
  publish: (action: LiveFrameAction) => void;
  unsubscribe: () => void;
}

export interface ConnectLiveFrameChannelHandlers {
  onAction: (action: LiveFrameAction) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

const RETRY_DELAYS_MS = [500, 1000, 2000, 4000, 8000, 15000]; // capped backoff, then holds at 15s

/**
 * Opens the broadcast channel for a table. Returns no-op stubs when Supabase
 * isn't configured so the rest of the app doesn't need to special-case that
 * everywhere. Exactly one channel/subscription is created per call, and the
 * caller owns its lifecycle via the returned `unsubscribe()` — always pair a
 * call to this with cleanup (see useLiveFrame's effect) to avoid duplicate
 * subscriptions leaking across re-renders/remounts.
 */
export function connectLiveFrameChannel(tableId: string, handlers: ConnectLiveFrameChannelHandlers): LiveFrameChannel {
  if (!isSupabaseConfigured()) {
    // No real Supabase project configured yet (client/.env still has the
    // placeholder VITE_SUPABASE_URL/ANON_KEY) — fall back to a same-browser
    // BroadcastChannel so multiple tabs on this machine (e.g. an admin tab
    // and a /tv/snooker/:id tab open for local testing) still sync this
    // table's actions instantly. This never reaches another device — once
    // real Supabase credentials are set, this branch is bypassed entirely
    // and the code above takes over automatically, no changes needed.
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('⚠️ Supabase not configured and BroadcastChannel unavailable — TV scoreboard will only update on this screen.');
      handlers.onStatusChange?.('unavailable');
      return { publish: () => {}, unsubscribe: () => {} };
    }

    console.warn(
      `⚠️ Supabase not configured — using a same-browser BroadcastChannel fallback for "${channelNameFor(tableId)}". ` +
      'Add real VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in client/.env to sync across separate devices (e.g. a real TV).'
    );
    const bc = new BroadcastChannel(channelNameFor(tableId));
    bc.onmessage = (event) => {
      const envelope = event.data as BroadcastEnvelope;
      if (envelope.senderId === senderId) return;
      handlers.onAction(envelope.action);
    };
    handlers.onStatusChange?.('local');
    return {
      publish: (action) => {
        const envelope: BroadcastEnvelope = { action, senderId, sentAt: Date.now() };
        bc.postMessage(envelope);
      },
      unsubscribe: () => bc.close(),
    };
  }

  let channel: RealtimeChannel | null = null;
  let retryAttempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let torndown = false;

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const subscribeChannel = () => {
    if (torndown) return;

    // .on() must be attached *before* .subscribe() — see module doc above.
    channel = supabase
      .channel(channelNameFor(tableId), { config: { broadcast: { self: false, ack: false } } })
      .on('broadcast', { event: 'action' }, ({ payload }) => {
        const envelope = payload as BroadcastEnvelope;
        if (envelope.senderId === senderId) return; // ignore our own echoes, if any
        handlers.onAction(envelope.action);
      })
      .subscribe((status) => {
        if (torndown) return;

        if (status === 'SUBSCRIBED') {
          retryAttempt = 0;
          handlers.onStatusChange?.('connected');
          return;
        }

        // CHANNEL_ERROR, TIMED_OUT, or CLOSED (unexpectedly, i.e. not from our
        // own teardown) — the underlying websocket/channel dropped. Reconnect
        // automatically with a capped backoff instead of requiring a reload.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          handlers.onStatusChange?.('reconnecting');
          clearRetryTimer();
          const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
          retryAttempt += 1;
          retryTimer = setTimeout(() => {
            if (torndown) return;
            if (channel) supabase.removeChannel(channel);
            channel = null;
            subscribeChannel();
          }, delay);
        }
      });
  };

  handlers.onStatusChange?.('connecting');
  subscribeChannel();

  return {
    publish: (action) => {
      if (!channel) return;
      const envelope: BroadcastEnvelope = { action, senderId, sentAt: Date.now() };
      channel.send({ type: 'broadcast', event: 'action', payload: envelope });
    },
    unsubscribe: () => {
      torndown = true;
      clearRetryTimer();
      if (channel) supabase.removeChannel(channel);
      channel = null;
    },
  };
}

/** Best-effort durable snapshot for reload recovery. Never on the hot path. */
export async function saveLiveFrameSnapshot(tableId: string, gameId: string | null, state: LiveFrameState): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('live_frames').upsert({
      table_id: tableId,
      game_id: gameId,
      state,
      updated_at: Date.now(),
    });
  } catch (err) {
    console.warn('⚠️ Could not persist TV live-frame snapshot:', err);
  }
}

export async function loadLiveFrameSnapshot(tableId: string): Promise<LiveFrameState | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('live_frames')
      .select('state')
      .eq('table_id', tableId)
      .single();
    if (error || !data) return null;
    return data.state as LiveFrameState;
  } catch (err) {
    console.warn('⚠️ Could not load TV live-frame snapshot:', err);
    return null;
  }
}
