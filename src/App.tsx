import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventPopover } from './components/EventPopover';
import { MonthView } from './components/MonthView';
import { Sidebar } from './components/Sidebar';
import { TimeGrid } from './components/TimeGrid';
import { Toolbar } from './components/Toolbar';
import { YearView } from './components/YearView';
import { CALENDARS } from './lib/calendars';
import { desktop, isMacApp } from './lib/desktop';
import { addDays, addMonths, dayKey, isSameDay, MONTHS, startOfDay, startOfMonth, startOfWeek } from './lib/date';
import { SPRING, SPRING_SOFT } from './lib/motion';
import { expandEvents, seriesIdOf } from './lib/recurrence';
import { seedEvents } from './lib/seed';
import type { CalendarId, CalEvent, Rect, ViewMode } from './lib/types';

const STORE = 'glass-calendar:v1';
const ORDER: ViewMode[] = ['day', 'week', 'month', 'year'];

function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(`${STORE}:${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* storage unavailable */ }
  return fallback();
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(`${STORE}:${key}`, JSON.stringify(v)); } catch { /* ignore */ }
}

function periodStart(view: ViewMode, d: Date) {
  if (view === 'day') return startOfDay(d);
  if (view === 'week') return startOfWeek(d);
  if (view === 'month') return startOfMonth(d);
  return new Date(d.getFullYear(), 0, 1);
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

type Trans = { dir: number; kind: 'nav' | 'view' };

const layerVariants = {
  enter: ({ dir, kind }: Trans) =>
    kind === 'view' ? { opacity: 0, scale: dir >= 0 ? 0.98 : 1.02, x: 0 } : { opacity: 0, x: dir * 40, scale: 1 },
  center: { opacity: 1, x: 0, scale: 1 },
  exit: ({ dir, kind }: Trans) =>
    kind === 'view' ? { opacity: 0, scale: dir >= 0 ? 1.02 : 0.98, x: 0 } : { opacity: 0, x: dir * -40, scale: 1 },
};

export default function App() {
  const now = useNow();
  const [dark, setDark] = useState(() =>
    load('dark', () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false),
  );
  const [view, setView] = useState<ViewMode>(() => load('view', () => 'week' as ViewMode));
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [trans, setTrans] = useState<Trans>({ dir: 0, kind: 'view' });
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 900);
  const [enabled, setEnabled] = useState<Record<CalendarId, boolean>>(() =>
    load('enabled', () => Object.fromEntries(CALENDARS.map((c) => [c.id, true])) as Record<CalendarId, boolean>),
  );
  const [events, setEvents] = useState<CalEvent[]>(() => load('events', () => seedEvents()));
  const [popover, setPopover] = useState<{ id: string; anchor: Rect; isNew: boolean } | null>(null);
  const [lastCalendar, setLastCalendar] = useState<CalendarId>('work');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    desktop?.setTheme(dark ? 'dark' : 'light');
    save('dark', dark);
  }, [dark]);
  useEffect(() => save('events', events), [events]);
  useEffect(() => save('enabled', enabled), [enabled]);
  useEffect(() => save('view', view), [view]);

  const visible = useMemo(() => events.filter((e) => enabled[e.calendar]), [events, enabled]);
  // Occurrences for the period on screen (repeating events expanded).
  const shown = useMemo(() => {
    const from = addDays(periodStart(view, cursor), -7).getTime();
    const to = view === 'year'
      ? new Date(cursor.getFullYear() + 1, 0, 8).getTime()
      : addDays(periodStart(view, cursor), 50).getTime();
    return expandEvents(visible, from, to);
  }, [visible, view, cursor]);
  const eventDays = useMemo(() => {
    const s = new Set<string>();
    const y = cursor.getFullYear();
    const yearly = expandEvents(visible, new Date(y - 1, 11, 1).getTime(), new Date(y + 1, 1, 1).getTime());
    for (const e of yearly) {
      for (let d = startOfDay(new Date(e.start)); d.getTime() < e.end; d = addDays(d, 1)) s.add(dayKey(d));
    }
    return s;
  }, [visible, cursor.getFullYear()]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(CALENDARS.map((x) => [x.id, 0])) as Record<CalendarId, number>;
    events.forEach((e) => c[e.calendar]++);
    return c;
  }, [events]);

  /** Move to a date (and optionally a view), choosing the transition direction. */
  const goTo = useCallback(
    (date: Date, nextView: ViewMode = view) => {
      setPopover(null);
      if (nextView !== view) {
        setTrans({ dir: Math.sign(ORDER.indexOf(view) - ORDER.indexOf(nextView)) || 1, kind: 'view' });
        setView(nextView);
      } else {
        const a = periodStart(view, cursor).getTime();
        const b = periodStart(view, date).getTime();
        setTrans({ dir: Math.sign(b - a), kind: 'nav' });
      }
      setCursor(startOfDay(date));
    },
    [view, cursor],
  );

  const step = useCallback(
    (n: number) => {
      const d =
        view === 'day' ? addDays(cursor, n)
          : view === 'week' ? addDays(cursor, 7 * n)
            : view === 'month' ? addMonths(cursor, n)
              : new Date(cursor.getFullYear() + n, cursor.getMonth(), 1);
      goTo(d);
    },
    [view, cursor, goTo],
  );

  const createEvent = useCallback(
    (start: Date, end: Date, allDay: boolean, anchor: Rect) => {
      const ev: CalEvent = {
        id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: 'New Event',
        calendar: enabled[lastCalendar] ? lastCalendar : (CALENDARS.find((c) => enabled[c.id])?.id ?? 'work'),
        start: start.getTime(),
        end: end.getTime(),
        allDay,
      };
      if (!enabled[ev.calendar]) setEnabled((e) => ({ ...e, [ev.calendar]: true }));
      setEvents((list) => [...list, ev]);
      setPopover({ id: ev.id, anchor, isNew: true });
    },
    [enabled, lastCalendar],
  );

  /**
   * Update an event. `id` may be one occurrence of a repeating series: time changes then
   * shift the whole series by the same amount, and other fields apply to the series.
   */
  const updateEvent = useCallback((id: string, patch: Partial<CalEvent>) => {
    const sid = seriesIdOf(id);
    const occ = id.includes('@') ? Number(id.split('@')[1]) : null;
    let newId = id;
    setEvents((list) =>
      list.map((e) => {
        if (e.id !== sid) return e;
        if (patch.start == null && patch.end == null) return { ...e, ...patch };
        const instStart = occ ?? e.start;
        const instEnd = instStart + (e.end - e.start);
        const ns = patch.start ?? instStart;
        const ne = patch.end ?? instEnd;
        const start = e.start + (ns - instStart);
        if (occ != null) newId = `${sid}@${ns}`;
        return { ...e, ...patch, start, end: start + (ne - ns), exdates: e.exdates?.map((x) => x + (ns - instStart)) };
      }),
    );
    if (newId !== id) setPopover((p) => (p && p.id === id ? { ...p, id: newId } : p));
    if (patch.calendar) setLastCalendar(patch.calendar);
  }, []);

  /** Delete a whole event/series, or just one occurrence of a repeating series. */
  const deleteEvent = useCallback((id: string, scope: 'one' | 'all' = 'all') => {
    setPopover(null);
    const sid = seriesIdOf(id);
    if (scope === 'all') return setEvents((list) => list.filter((e) => e.id !== sid));
    setEvents((list) =>
      list.map((e) => {
        if (e.id !== sid) return e;
        const occ = id.includes('@') ? Number(id.split('@')[1]) : e.start;
        return { ...e, exdates: [...(e.exdates ?? []), occ] };
      }),
    );
  }, []);

  const closePopover = useCallback(() => {
    setPopover((p) => {
      if (p) setEvents((list) => list.map((e) => (e.id === p.id && !e.title.trim() ? { ...e, title: 'New Event' } : e)));
      return null;
    });
  }, []);

  const openEvent = useCallback((id: string, anchor: Rect) => setPopover({ id, anchor, isNew: false }), []);

  const quickAdd = (anchor: Rect) => {
    const base = isSameDay(cursor, now) ? now : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 9);
    const s = new Date(base.getFullYear(), base.getMonth(), base.getDate(), base.getHours() + (base === now ? 1 : 0));
    if (view === 'year') goTo(s, 'week');
    createEvent(s, new Date(s.getTime() + 3600000), false, anchor);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft') step(-1);
      else if (k === 'arrowright') step(1);
      else if (k === 't') goTo(new Date());
      else if (k === 'd') goTo(cursor, 'day');
      else if (k === 'w') goTo(cursor, 'week');
      else if (k === 'm') goTo(cursor, 'month');
      else if (k === 'y') goTo(cursor, 'year');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, goTo, cursor]);

  // Native menu commands (desktop app only)
  const menuRef = { step, goTo, cursor, quickAdd };
  const menu = useRef(menuRef);
  menu.current = menuRef;
  useEffect(() => {
    if (!desktop) return;
    return desktop.onMenu((cmd) => {
      const m = menu.current;
      if (cmd.startsWith('view:')) m.goTo(m.cursor, cmd.slice(5) as ViewMode);
      else if (cmd === 'today') m.goTo(new Date());
      else if (cmd === 'prev') m.step(-1);
      else if (cmd === 'next') m.step(1);
      else if (cmd === 'toggle-sidebar') setSidebarOpen((o) => !o);
      else if (cmd === 'toggle-dark') setDark((d) => !d);
      else if (cmd === 'search') window.dispatchEvent(new Event('calendar:search'));
      else if (cmd === 'new-event') {
        const btn = document.querySelector('[aria-label="New event"]')?.getBoundingClientRect();
        m.quickAdd(btn ? { left: btn.left, top: btn.top, width: btn.width, height: btn.height } : { left: window.innerWidth - 60, top: 40, width: 1, height: 1 });
      }
    });
  }, []);

  const title = useMemo(() => {
    if (view === 'year') return { strong: String(cursor.getFullYear()), light: '' };
    if (view === 'day')
      return {
        strong: cursor.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        light: `${cursor.getFullYear()}`,
      };
    if (view === 'week') {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      if (s.getMonth() !== e.getMonth())
        return { strong: `${MONTHS[s.getMonth()].slice(0, 3)} – ${MONTHS[e.getMonth()].slice(0, 3)}`, light: `${e.getFullYear()}` };
    }
    return { strong: MONTHS[cursor.getMonth()], light: String(cursor.getFullYear()) };
  }, [view, cursor]);

  const layerKey = `${view}:${periodStart(view, cursor).getTime()}`;
  const popEvent = popover ? shown.find((e) => e.id === popover.id) ?? events.find((e) => e.id === popover.id) : undefined;
  const selectedId = popEvent?.id ?? null;

  const timeGridProps = {
    events: shown, now, dark, selectedId, newCalendar: lastCalendar,
    onCreate: createEvent,
    onOpen: openEvent,
    onMove: (id: string, start: number, end: number) => updateEvent(id, { start, end }),
    onDayClick: (d: Date) => goTo(d, 'day'),
  };

  return (
    <MotionConfig transition={SPRING}>
      <div className="flex h-full font-sans text-neutral-900 dark:text-neutral-100">
        <Sidebar
          open={sidebarOpen}
          selected={cursor}
          today={now}
          eventDays={eventDays}
          enabled={enabled}
          counts={counts}
          onToggle={(id) => setEnabled((e) => ({ ...e, [id]: !e[id] }))}
          onSelectDate={(d) => goTo(d, view === 'year' || view === 'month' ? view === 'year' ? 'week' : view : view)}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="relative flex min-w-0 flex-1 flex-col bg-white dark:bg-[#1C1C1E]">
          <Toolbar
            view={view}
            title={title}
            dir={trans.kind === 'nav' ? trans.dir : 0}
            dark={dark}
            events={visible}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onToday={() => goTo(new Date())}
            onView={(v) => goTo(cursor, v)}
            onAdd={quickAdd}
            onToggleDark={() => setDark((d) => !d)}
            trafficInset={isMacApp && !sidebarOpen}
            onSearchPick={(ev, anchor) => {
              goTo(new Date(ev.start), view === 'year' || view === 'month' ? 'week' : view);
              setTimeout(() => setPopover({ id: ev.id, anchor, isNew: false }), 0);
            }}
          />
          <main className="relative isolate flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={trans}>
              <motion.div
                key={layerKey}
                custom={trans}
                variants={layerVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={trans.kind === 'view' ? SPRING_SOFT : SPRING}
                className="absolute inset-0"
              >
                {view === 'day' && <TimeGrid days={[cursor]} {...timeGridProps} />}
                {view === 'week' && (
                  <TimeGrid days={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))} {...timeGridProps} />
                )}
                {view === 'month' && (
                  <MonthView
                    month={startOfMonth(cursor)}
                    events={shown}
                    now={now}
                    dark={dark}
                    selectedId={selectedId}
                    onOpen={openEvent}
                    onDayClick={(d) => goTo(d, 'day')}
                    onCreateOnDay={(d, anchor) =>
                      createEvent(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9), new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10), false, anchor)
                    }
                    onMoveToDay={(id, d) => {
                      const ev = shown.find((e) => e.id === id);
                      if (!ev) return;
                      const s = new Date(ev.start);
                      const ns = new Date(d.getFullYear(), d.getMonth(), d.getDate(), s.getHours(), s.getMinutes()).getTime();
                      updateEvent(id, { start: ns, end: ns + (ev.end - ev.start) });
                    }}
                  />
                )}
                {view === 'year' && (
                  <YearView
                    year={cursor.getFullYear()}
                    now={now}
                    eventDays={eventDays}
                    onMonthClick={(d) => goTo(d, 'month')}
                    onDayClick={(d) => goTo(d, 'day')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <AnimatePresence>
          {popover && popEvent && (
            <EventPopover
              key={popover.id}
              event={popEvent}
              anchor={popover.anchor}
              isNew={popover.isNew}
              onChange={(patch) => updateEvent(popover.id, patch)}
              onDelete={(scope) => deleteEvent(popover.id, scope)}
              onClose={closePopover}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
