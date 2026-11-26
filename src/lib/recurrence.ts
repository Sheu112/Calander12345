import { addDays } from './date';
import type { CalEvent, RepeatRule } from './types';

export const REPEAT_OPTIONS: { id: RepeatRule; label: string }[] = [
  { id: 'none', label: 'Never' },
  { id: 'daily', label: 'Every Day' },
  { id: 'weekly', label: 'Every Week' },
  { id: 'biweekly', label: 'Every 2 Weeks' },
  { id: 'monthly', label: 'Every Month' },
  { id: 'yearly', label: 'Every Year' },
];

const isRecurring = (ev: CalEvent) => !!ev.repeat && ev.repeat !== 'none';

/** Start of the i-th occurrence, or null when that month/year has no such date (e.g. Feb 31). */
function nth(start: Date, rule: RepeatRule, i: number): Date | null {
  if (rule === 'daily') return addDays(start, i);
  if (rule === 'weekly') return addDays(start, 7 * i);
  if (rule === 'biweekly') return addDays(start, 14 * i);
  const y = start.getFullYear() + (rule === 'yearly' ? i : 0);
  const m = start.getMonth() + (rule === 'monthly' ? i : 0);
  const d = new Date(y, m, start.getDate(), start.getHours(), start.getMinutes());
  return d.getDate() === start.getDate() ? d : null;
}

/** Replace recurring events with their occurrences that overlap [from, to). */
export function expandEvents(events: CalEvent[], from: number, to: number): CalEvent[] {
  const out: CalEvent[] = [];
  for (const ev of events) {
    if (!isRecurring(ev)) {
      out.push(ev);
      continue;
    }
    const dur = ev.end - ev.start;
    const base = new Date(ev.start);
    const until = ev.repeatUntil != null ? addDays(new Date(ev.repeatUntil), 1).getTime() : Infinity;
    const ex = new Set(ev.exdates ?? []);
    // Jump close to the window so far-away views stay cheap.
    const step = { daily: 1, weekly: 7, biweekly: 14, monthly: 28, yearly: 365 }[ev.repeat as Exclude<RepeatRule, 'none'>];
    let i = Math.max(0, Math.floor((from - dur - ev.start) / (step * 86400000)) - 2);
    for (let guard = 0; guard < 3000; guard++, i++) {
      const s = nth(base, ev.repeat!, i);
      if (!s) continue;
      const st = s.getTime();
      if (st >= to || st >= until) break;
      if (st + dur <= from || ex.has(st)) continue;
      out.push({ ...ev, id: i === 0 ? ev.id : `${ev.id}@${st}`, seriesId: ev.id, start: st, end: st + dur });
    }
  }
  return out;
}

export const seriesIdOf = (id: string) => id.split('@')[0];
