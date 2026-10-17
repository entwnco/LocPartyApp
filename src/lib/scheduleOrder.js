// Schedule rows store a free-text time ("3:00 PM") plus a sort number.
// Guests should see the day in time order unless an admin has set a custom order.
// Custom order is stored in sort_order at or above MANUAL_ORDER_BASE so it can
// be told apart from the small indexes left by older saves.

export const MANUAL_ORDER_BASE = 10000;

const EARLY_MORNING_MINUTES = 5 * 60;

export function isManualScheduleOrder(items) {
  return items.some((item) => (item.sortOrder ?? 0) >= MANUAL_ORDER_BASE);
}

export function parseScheduleTime(label) {
  const raw = String(label ?? '').trim().toLowerCase().replace(/\./g, '');
  if (!raw || raw === 'tbd') return null;
  if (raw === 'noon') return { minutes: 12 * 60, explicit: true };
  if (raw === 'midnight') return { minutes: 0, explicit: true };

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm|o'clock)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] == null ? 0 : Number(match[2]);
  const meridiem = match[3] === 'am' || match[3] === 'pm' ? match[3] : '';
  if (minute > 59 || hour > 23) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'am') hour = hour === 12 ? 0 : hour;
    else hour = hour === 12 ? 12 : hour + 12;
    return { minutes: hour * 60 + minute, explicit: true };
  }

  return { minutes: hour * 60 + minute, explicit: false };
}

function clockMinutes(parsed) {
  if (!parsed) return null;
  let minutes = parsed.minutes;
  // "3" or "3:00" on a night schedule means 3:00 PM. Explicit am/pm is left alone.
  if (!parsed.explicit && minutes >= 60 && minutes < 12 * 60) minutes += 12 * 60;
  return minutes;
}

export function sortScheduleItems(items) {
  if (isManualScheduleOrder(items)) {
    return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  const decorated = items.map((item) => {
    const parsed = parseScheduleTime(item.time);
    return { item, parsed, key: clockMinutes(parsed) };
  });
  const hasEvening = decorated.some((entry) => entry.key != null && entry.key >= 17 * 60);
  const ranked = decorated.map((entry) => {
    let key = entry.key;
    if (hasEvening && entry.parsed?.explicit && key != null && key < EARLY_MORNING_MINUTES) {
      key += 24 * 60;
    }
    return { ...entry, key };
  });

  ranked.sort((a, b) => {
    if (a.key == null && b.key == null) return (a.item.sortOrder ?? 0) - (b.item.sortOrder ?? 0);
    if (a.key == null) return 1;
    if (b.key == null) return -1;
    if (a.key !== b.key) return a.key - b.key;
    return (a.item.sortOrder ?? 0) - (b.item.sortOrder ?? 0);
  });
  return ranked.map((entry) => entry.item);
}
