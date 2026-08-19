export function fmt(n) {
  return Math.round(n * 100) / 100;
}

export function fmtDate(ts, lang = 'fr') {
  const d = new Date(ts);
  const locale = lang === 'ar' ? 'ar-MA-u-nu-latn' : lang;
  return d.toLocaleDateString(locale) + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function fmtTimestamp(ts, lang = 'fr') {
  const d = new Date(ts);
  const locale = lang === 'ar' ? 'ar-MA-u-nu-latn' : lang;
  return d.toLocaleDateString(locale) + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtTimeOnly(ts, lang = 'fr') {
  const locale = lang === 'ar' ? 'ar-MA-u-nu-latn' : lang;
  return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ageFromBirthdate(bd) {
  if (!bd) return null;
  const b = new Date(bd), now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function nextBirthday(bd) {
  if (!bd) return null;
  const b = new Date(bd), now = new Date();
  const next = new Date(now.getFullYear(), b.getMonth(), b.getDate(), 0, 0, 0);
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return next;
}

export function hoursUntilBirthday(bd) {
  const next = nextBirthday(bd);
  if (!next) return Infinity;
  return (next - new Date()) / (1000 * 60 * 60);
}

export function isBirthdayToday(bd) {
  if (!bd) return false;
  const b = new Date(bd), now = new Date();
  return b.getMonth() === now.getMonth() && b.getDate() === now.getDate();
}

export function isToday(ts) {
  return new Date(ts).toDateString() === new Date().toDateString();
}

export function isThisWeek(ts) {
  const d = new Date(ts), now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

export function isThisMonth(ts) {
  const d = new Date(ts), now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function durationStr(start, end) {
  const ms = (end || Date.now()) - start;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function fullName(p) {
  if (!p) return '⚠️ deleted';
  return ((p.name || '') + ' ' + (p.lastname || '')).trim();
}

export function initials(p) {
  if (!p) return '?';
  const n = (p.name || '')[0] || '';
  const l = (p.lastname || '')[0] || '';
  return ((n + l) || (p.name || '?')[0]).toUpperCase();
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
