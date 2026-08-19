import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';

let syncDebitizeTimer = null;
let isApplyingRemoteUpdate = false;
export let realtimeChannel = null;

// Same-origin, same-browser fallback so multiple tabs (e.g. an admin tab and
// a /tv/snooker/:id tab open locally for testing) still sync instantly even
// before real Supabase credentials are configured. This only ever activates
// when Supabase isn't configured — the moment real credentials are added,
// this is bypassed entirely and Supabase Realtime (which also reaches other
// devices, not just other tabs of this browser) takes over automatically.
const LOCAL_CHANNEL_NAME = 'juby-local-sync';
let localChannel = null;
let sseSource = null;

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005';
};

/** Strips runtime-only fields that should never be pushed/broadcast to other clients. */
const stripRuntimeFields = (state) => {
  // eslint-disable-next-line no-unused-vars
  const { currentUser, currentLang, pendingAction, syncStatus, syncDirty, syncPaused, onStateChanged, ...dbState } = state;
  return dbState;
};

/**
 * Pull full application state from Supabase app_state table or local Express server fallback
 */
export const pullStateFromRemote = async () => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('payload')
        .eq('key', 'main_state')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Supabase pull warning:', error.message);
      }

      if (data && data.payload) {
        return data.payload;
      }
    } catch (err) {
      console.warn('⚠️ Supabase pull failed, trying local server fallback...', err);
    }
  }

  // Fallback to local Express server
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/sync/pull`);
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.state) {
        return result.state;
      }
    }
  } catch {
    console.log('ℹ️ Local server sync unreachable. Operating in local storage mode.');
  }

  return null;
};

/**
 * Push full application state to Supabase or local Express server fallback
 */
export const pushStateToRemote = async (state) => {
  const dbState = stripRuntimeFields(state);

  let syncedToSupabase = false;

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('app_state')
        .upsert({
          key: 'main_state',
          payload: dbState,
          updated_at: Date.now()
        });

      if (!error) {
        syncedToSupabase = true;
      } else {
        console.warn('⚠️ Supabase push warning:', error.message);
      }
    } catch (err) {
      console.warn('⚠️ Supabase push failed:', err);
    }
  }

  // Always attempt local server backup as fallback/secondary sync
  try {
    await fetch(`${getApiBaseUrl()}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: dbState })
    });
  } catch {
    // Ignore local server offline error if Supabase succeeded
  }

  // Same-browser fallback (see LOCAL_CHANNEL_NAME doc above) — instant, no
  // network involved, so other tabs of this same browser (e.g. a /tv page
  // open locally) still see the change immediately even pre-Supabase.
  if (!isSupabaseConfigured() && localChannel) {
    localChannel.postMessage(dbState);
  }

  return syncedToSupabase;
};

/**
 * Initialize bidirectional sync logic and Supabase Realtime channel subscriptions
 */
export const initSupabaseSync = (store) => {
  // Initial remote state pull
  pullStateFromRemote().then((remoteState) => {
    if (remoteState) {
      isApplyingRemoteUpdate = true;
      store.setState({
        ...remoteState,
        syncStatus: 'ok',
        syncDirty: false
      });
      isApplyingRemoteUpdate = false;
      console.log('✅ Remote state loaded into store.');
    }
  });

  // Subscribe to Supabase Realtime changes
  if (isSupabaseConfigured()) {
    realtimeChannel = supabase
      .channel('juby-state-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_state', filter: 'key=eq.main_state' },
        (payload) => {
          if (isApplyingRemoteUpdate) return;

          if (payload.new && payload.new.payload) {
            console.log('⚡ Received real-time update from Supabase');
            isApplyingRemoteUpdate = true;
            store.setState({
              ...payload.new.payload,
              syncStatus: 'ok',
              syncDirty: false
            });
            isApplyingRemoteUpdate = false;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Connected to Supabase Realtime synchronization stream.');
        }
      });
  } else {
    console.warn(
      '⚠️ Supabase is not configured (client/.env still has placeholder VITE_SUPABASE_URL/ANON_KEY). ' +
      'Using two local-only fallbacks until real credentials are added: a same-browser BroadcastChannel ' +
      '(instant, but only reaches other tabs of THIS browser) and the local Express server\'s live stream ' +
      '(reaches other devices too, e.g. a real TV, as long as they can reach this machine — see VITE_API_BASE_URL).'
    );

    // (a) Same-browser BroadcastChannel — instant, zero setup, but scoped to this browser only.
    if (typeof BroadcastChannel !== 'undefined') {
      localChannel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
      localChannel.onmessage = (event) => {
        if (isApplyingRemoteUpdate) return;
        isApplyingRemoteUpdate = true;
        store.setState({
          ...event.data,
          syncStatus: 'ok',
          syncDirty: false
        });
        isApplyingRemoteUpdate = false;
      };
    }

    // (b) Local Express server live stream (Server-Sent Events) — this is what
    // actually reaches a *separate device* (e.g. a real TV on the same network)
    // before Supabase is set up, since BroadcastChannel can't cross browsers/devices.
    // The server already gets every pushed state via POST /api/sync (below) and
    // fans it back out to every connected client, including this one on reload.
    if (typeof EventSource !== 'undefined') {
      try {
        sseSource = new EventSource(`${getApiBaseUrl()}/api/sync/stream`);
        sseSource.onmessage = (event) => {
          if (isApplyingRemoteUpdate || !event.data) return;
          try {
            const remoteState = JSON.parse(event.data);
            isApplyingRemoteUpdate = true;
            store.setState({
              ...remoteState,
              syncStatus: 'ok',
              syncDirty: false
            });
            isApplyingRemoteUpdate = false;
          } catch (err) {
            console.warn('⚠️ Could not parse local server live-stream update:', err);
          }
        };
        sseSource.onerror = () => {
          // EventSource reconnects on its own by design; nothing to do here.
        };
      } catch (err) {
        console.warn('⚠️ Could not open local server live stream:', err);
      }
    }
  }

  // Register store mutation hook for debouncing push
  const handleStateChange = () => {
    if (isApplyingRemoteUpdate) return;
    const currentState = store.getState();
    if (currentState.syncPaused) return;

    if (syncDebitizeTimer) clearTimeout(syncDebitizeTimer);

    syncDebitizeTimer = setTimeout(async () => {
      store.setState({ syncStatus: 'syncing' });
      await pushStateToRemote(store.getState());
      store.setState({
        syncStatus: 'ok',
        syncDirty: false
      });
    }, 1000);
  };

  store.setState({ onStateChanged: handleStateChange });
};
