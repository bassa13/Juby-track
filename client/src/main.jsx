import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { useJubyStore } from './core/store/useJubyStore.js';
import { initSupabaseSync } from './core/store/supabaseSync.js';
import { TvRoute, isTvRoute } from './features/tv/TvRoute.tsx';

// Initialize Supabase realtime state synchronization
initSupabaseSync(useJubyStore);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isTvRoute(window.location.pathname) ? <TvRoute /> : <App />}
    </ErrorBoundary>
  </StrictMode>
);
