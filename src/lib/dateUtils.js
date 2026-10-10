export function getKolkataDate(dateInput) {
  const date = new Date(dateInput);
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

export function getStartOfDayUTC(baseDateMs, offsetDays = 0) {
  const kolkataDate = getKolkataDate(baseDateMs);
  return new Date(Date.UTC(
    kolkataDate.getFullYear(), 
    kolkataDate.getMonth(), 
    kolkataDate.getDate() + offsetDays, 
    -5, -30, 0, 0
  ));
}

export function getOverlapDurationMs(joinedAt, leftAt, periodStartUTC, periodEndUTC, nowMs) {
  const start = Math.max(new Date(joinedAt).getTime(), periodStartUTC);
  const end = Math.min(leftAt ? new Date(leftAt).getTime() : nowMs, periodEndUTC);
  return Math.max(0, end - start);
}

export function formatDuration(ms) {
  if (ms <= 0) return '0m';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
