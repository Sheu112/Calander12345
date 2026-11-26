import { addDays, atMinutes, startOfDay, startOfWeek } from './date';
import type { CalEvent, CalendarId } from './types';

let n = 0;
const id = () => `seed-${++n}`;

function timed(day: Date, startH: number, endH: number, title: string, calendar: CalendarId, extra: Partial<CalEvent> = {}): CalEvent {
  return { id: id(), title, calendar, start: atMinutes(day, startH * 60).getTime(), end: atMinutes(day, endH * 60).getTime(), ...extra };
}
function allDay(day: Date, title: string, calendar: CalendarId, days = 1, extra: Partial<CalEvent> = {}): CalEvent {
  return { id: id(), title, calendar, allDay: true, start: startOfDay(day).getTime(), end: addDays(startOfDay(day), days).getTime(), ...extra };
}

/** Sample events laid out around the current week so the app always looks lived-in. */
export function seedEvents(today = new Date()): CalEvent[] {
  n = 0;
  const w = startOfWeek(today);
  const d = (i: number) => addDays(w, i);
  const y = today.getFullYear();
  const ev: CalEvent[] = [
    // last week
    timed(d(-6), 10, 11, 'Quarterly planning', 'work', { location: 'Room 4B' }),
    timed(d(-4), 18.5, 20, 'Climbing gym', 'personal'),
    timed(d(-2), 12, 13.5, 'Brunch with Maya', 'family', { location: 'Café Lune' }),
    // this week
    timed(d(0), 9.5, 11, 'Farmers market', 'personal', { location: 'Riverside Park' }),
    timed(d(0), 17, 19, 'Family dinner', 'family', { location: 'Home' }),
    timed(d(1), 9, 9.5, 'Team standup', 'work', { location: 'Zoom', repeat: 'weekly' }),
    timed(d(1), 10, 11.5, 'Design review: onboarding', 'work', { location: 'Studio', notes: 'Bring the motion prototypes.' }),
    timed(d(1), 10.5, 11.25, 'Dentist', 'personal'),
    timed(d(1), 13, 14, 'Lunch with Priya', 'personal', { location: 'Noodle Bar' }),
    timed(d(1), 15, 16.5, 'Prototype handoff', 'work'),
    timed(d(2), 9, 9.5, 'Team standup', 'work', { location: 'Zoom', repeat: 'weekly' }),
    timed(d(2), 11, 12, '1:1 with Jordan', 'work'),
    timed(d(2), 14, 15.5, 'Ship v2 spec — deadline', 'holidays', { notes: 'Hard deadline. Final review with leads.' }),
    timed(d(2), 19, 20.5, 'Yoga', 'personal', { location: 'Studio Flow', repeat: 'weekly' }),
    timed(d(3), 9, 9.5, 'Team standup', 'work', { location: 'Zoom', repeat: 'weekly' }),
    timed(d(3), 12, 13, 'Lunch & learn: Springs', 'work', { notes: 'Stiffness, damping, mass.' }),
    timed(d(3), 16, 17.5, 'Pick up kids', 'family'),
    timed(d(4), 7.5, 9, 'Flight YYZ → SFO', 'travel', { location: 'Terminal 1', notes: 'Seat 14A' }),
    timed(d(4), 13, 14.5, 'Client workshop', 'work', { location: 'SF office' }),
    timed(d(4), 18, 20, 'Dinner with the Chens', 'family'),
    timed(d(5), 10, 12, 'Hike: Lands End', 'personal'),
    timed(d(5), 15, 16, 'Call Mom', 'family', { repeat: 'biweekly' }),
    timed(d(6), 11, 12.5, 'Flight SFO → YYZ', 'travel'),
    // next week
    timed(d(8), 9, 10, 'Sprint kickoff', 'work'),
    timed(d(9), 14, 15, 'Haircut', 'personal'),
    timed(d(11), 18, 21, 'Concert', 'personal', { location: 'Massey Hall' }),
    timed(d(13), 10, 12, 'Soccer game', 'family'),
    // all-day
    allDay(d(2), 'Design Systems Summit', 'work', 1, { location: 'Convention Centre' }),
    allDay(d(2), "Grandma's birthday", 'family'),
    allDay(d(2), 'Pack for trip', 'travel'),
    allDay(d(4), 'San Francisco trip', 'travel', 3),
    allDay(d(10), 'Recycling day', 'personal'),
    // holidays (current year)
    allDay(new Date(y, 0, 1), "New Year's Day", 'holidays'),
    allDay(new Date(y, 1, 14), "Valentine's Day", 'holidays'),
    allDay(new Date(y, 9, 31), 'Halloween', 'holidays'),
    allDay(new Date(y, 11, 24), 'Christmas Eve', 'holidays'),
    allDay(new Date(y, 11, 25), 'Christmas Day', 'holidays'),
    allDay(new Date(y, 11, 26), 'Boxing Day', 'holidays'),
    allDay(new Date(y, 11, 31), "New Year's Eve", 'holidays'),
    allDay(new Date(y + 1, 0, 1), "New Year's Day", 'holidays'),
  ];
  return ev;
}
