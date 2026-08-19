import { useEffect } from 'react';
import type { LiveFrameAction } from './types.ts';

// Smart TV browsers vary wildly in what they hand a plain web page:
//  - D-pad (arrows), OK/Enter, and Back are delivered as normal KeyboardEvents
//    on every platform we target (Android TV / Google TV, Tizen, webOS, Fire TV).
//  - Number keys 1-7 are likewise standard KeyboardEvents everywhere.
//  - The four colour buttons and the Play/Pause media key are NOT forwarded to
//    web content on Chromium-based TV platforms (Android TV, Google TV, Fire TV,
//    Chromecast with Google TV) at all — there's no web standard for them there.
//    Samsung Tizen and LG webOS *do* expose them, historically via the legacy
//    keyCodes below (403-406, 413/415/19/179), and on some Tizen versions a
//    page must call tizen.tvinputdevice.registerKey() before they'll fire.
// Net effect: colour-button and play/pause shortcuts are handled here on a
// best-effort basis, and the TV screen also renders on-screen equivalents
// (focusable, navigable with the D-pad) so every platform has a way in.

export interface RemoteControlHandlers {
  dispatch: (action: LiveFrameAction) => void;
  onNavigate?: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onConfirm?: () => void;
  onBack?: () => void;
}

const COLOR_KEY_NAMES = ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'];
const MEDIA_KEY_NAMES = ['MediaPlayPause', 'MediaPlay', 'MediaPause'];

interface TizenTvInputDevice {
  registerKey: (key: string) => void;
}
declare global {
  interface Window {
    tizen?: { tvinputdevice?: TizenTvInputDevice };
    webOS?: unknown;
  }
}

export function useRemoteControl(handlers: RemoteControlHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowUp':
          handlers.onNavigate?.('up');
          e.preventDefault();
          return;
        case 'ArrowDown':
          handlers.onNavigate?.('down');
          e.preventDefault();
          return;
        case 'ArrowLeft':
          handlers.onNavigate?.('left');
          e.preventDefault();
          return;
        case 'ArrowRight':
          handlers.onNavigate?.('right');
          e.preventDefault();
          return;
        case 'Enter':
          handlers.onConfirm?.();
          return;
        case 'Backspace':
        case 'Escape':
        case 'GoBack':
        case 'BrowserBack':
        case 'XF86Back':
          handlers.onBack?.();
          return;
        case '0':
          handlers.dispatch({ type: 'TIMER_RESET' });
          return;
        case '1':
          handlers.dispatch({ type: 'POT_RED' });
          return;
        case '2':
          handlers.dispatch({ type: 'POT_COLOR', color: 'yellow' });
          return;
        case '3':
          handlers.dispatch({ type: 'POT_COLOR', color: 'green' });
          return;
        case '4':
          handlers.dispatch({ type: 'POT_COLOR', color: 'brown' });
          return;
        case '5':
          handlers.dispatch({ type: 'POT_COLOR', color: 'blue' });
          return;
        case '6':
          handlers.dispatch({ type: 'POT_COLOR', color: 'pink' });
          return;
        case '7':
          handlers.dispatch({ type: 'POT_COLOR', color: 'black' });
          return;
      }

      if (MEDIA_KEY_NAMES.includes(e.key) || [179, 415, 19, 413].includes(e.keyCode)) {
        handlers.dispatch({ type: 'TIMER_TOGGLE' });
        return;
      }

      if (e.key === 'ColorF0Red' || e.keyCode === 403) {
        handlers.dispatch({ type: 'MANUAL_POINT', playerIndex: 0 });
        return;
      }
      if (e.key === 'ColorF1Green' || e.keyCode === 404) {
        handlers.dispatch({ type: 'MANUAL_POINT', playerIndex: 1 });
        return;
      }
      if (e.key === 'ColorF2Yellow' || e.keyCode === 405) {
        handlers.dispatch({ type: 'UNDO' });
        return;
      }
      if (e.key === 'ColorF3Blue' || e.keyCode === 406) {
        handlers.dispatch({ type: 'NEXT_PLAYER' });
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, enabled]);

  // Tizen requires explicit opt-in before colour/media keys are ever
  // delivered to a web app's keydown handler at all.
  useEffect(() => {
    const registerKey = window.tizen?.tvinputdevice?.registerKey;
    if (!registerKey) return;
    for (const key of [...COLOR_KEY_NAMES, ...MEDIA_KEY_NAMES]) {
      try {
        registerKey(key);
      } catch {
        // Already registered, or not supported on this Tizen version — safe to ignore.
      }
    }
  }, []);
}
