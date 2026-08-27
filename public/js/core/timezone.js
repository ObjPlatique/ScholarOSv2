export const TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const TIME_ZONE_LABEL = 'Hà Nội (GMT+7)';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

export function getZonedParts(value = new Date()) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(value)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second)
  };
}

export function todayISO(value = new Date()) {
  const p = getZonedParts(value);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function formatDate(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  return todayISO(value);
}

export function dateFromISO(iso) {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number);
  if (![y, m, d].every(Number.isFinite)) return dateFromISO(todayISO());
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function getWeekday(iso) {
  return dateFromISO(iso).getUTCDay();
}

export function getCurrentTimeParts(value = new Date()) {
  const p = getZonedParts(value);
  return {
    iso: todayISO(value),
    minutes: p.hour * 60 + p.minute,
    hour: p.hour,
    minute: p.minute,
    second: p.second
  };
}

export function formatDateTime(value = new Date(), options = {}) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: TIME_ZONE, ...options }).format(value);
}
