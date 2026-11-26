export type CalendarId = 'work' | 'personal' | 'family' | 'holidays' | 'travel';
export type ViewMode = 'day' | 'week' | 'month' | 'year';

export interface CalEvent {
  id: string;
  title: string;
  calendar: CalendarId;
  /** epoch ms */
  start: number;
  /** epoch ms (exclusive end; for all-day events, the start of the day after the last day) */
  end: number;
  allDay?: boolean;
  location?: string;
  notes?: string;
}

export interface Rect { left: number; top: number; width: number; height: number }

export interface CalendarDef {
  id: CalendarId;
  name: string;
  color: string;
  text: { light: string; dark: string };
}
