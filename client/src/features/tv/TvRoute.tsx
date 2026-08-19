import { TVScoreboard } from './TVScoreboard.tsx';
import './tv.css';

const TV_PATH_RE = /^\/tv\/snooker\/([^/]+)\/?$/;

/** True when the current path should render the standalone TV page instead of the main app. */
export function isTvRoute(pathname: string): boolean {
  return TV_PATH_RE.test(pathname);
}

/** Reads `/tv/snooker/:tableId` from the current URL and renders the scoreboard for it. */
export function TvRoute() {
  const match = window.location.pathname.match(TV_PATH_RE);
  const tableId = match ? decodeURIComponent(match[1]) : null;

  if (!tableId) {
    return (
      <div className="tv-root">
        <div className="tv-idle">Invalid TV link. Expected /tv/snooker/&lt;table-id&gt;.</div>
      </div>
    );
  }

  return <TVScoreboard tableId={tableId} />;
}
