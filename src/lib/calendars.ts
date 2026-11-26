import type { CalendarDef, CalendarId, CalEvent } from './types';

export const CALENDARS: CalendarDef[] = [
  { id: 'work', name: 'Work', color: '#AF52DE', text: { light: '#7B2CA3', dark: '#DDA0FF' } },
  { id: 'personal', name: 'Personal', color: '#34C759', text: { light: '#1B7A33', dark: '#63E08A' } },
  { id: 'family', name: 'Family', color: '#007AFF', text: { light: '#0055C4', dark: '#64AEFF' } },
  { id: 'holidays', name: 'Holidays', color: '#FF3B30', text: { light: '#C2190F', dark: '#FF7A72' } },
  { id: 'travel', name: 'Travel', color: '#FF9500', text: { light: '#A65C00', dark: '#FFB84D' } },
];

export const CAL: Record<CalendarId, CalendarDef> = Object.fromEntries(
  CALENDARS.map((c) => [c.id, c]),
) as Record<CalendarId, CalendarDef>;

/** Pastel pill styling for an event. */
export function pillStyle(ev: Pick<CalEvent, 'calendar'>, dark: boolean, selected = false) {
  const c = CAL[ev.calendar];
  if (selected) return { background: c.color, color: '#fff', accent: 'rgba(255,255,255,.55)' };
  return {
    background: c.color + (dark ? '38' : '1F'),
    color: dark ? c.text.dark : c.text.light,
    accent: c.color,
  };
}
