export type CalendarId = 'work' | 'personal' | 'family' | 'holidays' | 'travel';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
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
  /** Recurrence rule; occurrences are generated on the fly. */
  repeat?: RepeatRule;
  /** Last day (epoch ms, start of day) an occurrence may start on. */
  repeatUntil?: number;
  /** Start times (epoch ms) of occurrences removed from the series. */
  exdates?: number[];
  /** Set on generated occurrences: the id of the series they belong to. */
  seriesId?: string;
}

export interface Rect { left: number; top: number; width: number; height: number }

export interface CalendarDef {
  id: CalendarId;
  name: string;
  color: string;
  text: { light: string; dark: string };
}
