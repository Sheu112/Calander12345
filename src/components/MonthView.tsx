import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { CAL, pillStyle } from '../lib/calendars';
import { addDays, dayKey, fmtTime, isSameDay, isSameMonth, monthGrid, WEEKDAYS_SHORT } from '../lib/date';
import { SPRING } from '../lib/motion';
import type { CalEvent, Rect } from '../lib/types';

interface Props {
  month: Date;
  events: CalEvent[];
  now: Date;
  dark: boolean;
  selectedId: string | null;
  onOpen: (id: string, anchor: Rect) => void;
  onDayClick: (d: Date) => void;
  onCreateOnDay: (d: Date, anchor: Rect) => void;
  onMoveToDay: (id: string, d: Date) => void;
}

const MAX = 3;

export function MonthView({ month, events, now, dark, selectedId, onOpen, onDayClick, onCreateOnDay, onMoveToDay }: Props) {
  const days = monthGrid(month);
  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    const first = days[0].getTime();
    const last = addDays(days[41], 1).getTime();
    for (const ev of events) {
      if (ev.end <= first || ev.start >= last) continue;
      for (let i = 0; i < 42; i++) {
        const ds = days[i].getTime();
        const de = addDays(days[i], 1).getTime();
        if (ev.start < de && ev.end > ds) {
          const k = dayKey(days[i]);
          if (!m.has(k)) m.set(k, []);
          m.get(k)!.push(ev);
        }
      }
    }
    m.forEach((list) => list.sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || a.start - b.start));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, month.getTime()]);

  return (
    <div className="flex h-full flex-col">
      <div className="glass hairline grid grid-cols-7 border-b">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="px-2 py-1.5 text-right text-[12px] font-medium text-neutral-500">{w}</div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((d, i) => {
          const list = byDay.get(dayKey(d)) ?? [];
          const inMonth = isSameMonth(d, month);
          const isToday = isSameDay(d, now);
          return (
            <div
              key={i}
              data-day={d.getTime()}
              onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-event]')) return;
                const r = e.currentTarget.getBoundingClientRect();
                onCreateOnDay(d, { left: r.left, top: r.top, width: r.width, height: r.height });
              }}
              className={
                'hairline relative min-h-0 overflow-hidden border-b p-1 ' +
                (i % 7 ? 'border-l ' : '') +
                (d.getDay() === 0 || d.getDay() === 6 ? 'bg-black/[0.015] dark:bg-white/[0.015]' : '')
              }
            >
              <div className="flex justify-end">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onDayClick(d)}
                  className={
                    'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[13px] tabular-nums transition-colors ' +
                    (isToday
                      ? 'bg-[#FF3B30] font-semibold text-white'
                      : inMonth
                        ? 'text-neutral-900 hover:bg-black/[0.06] dark:text-neutral-100 dark:hover:bg-white/[0.08]'
                        : 'text-neutral-400 hover:bg-black/[0.05] dark:text-neutral-600')
                  }
                >
                  {d.getDate() === 1 ? `${d.toLocaleDateString('en-US', { month: 'short' })} 1` : d.getDate()}
                </motion.button>
              </div>
              <div className="mt-0.5 space-y-[2px]">
                <AnimatePresence initial={false}>
                  {list.slice(0, MAX).map((ev) => {
                    const sel = ev.id === selectedId;
                    const st = pillStyle(ev, dark, sel);
                    return (
                      <motion.div
                        key={ev.id}
                        layout="position"
                        data-event
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: inMonth ? 1 : 0.55, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={SPRING}
                        whileTap={{ scale: 0.97 }}
                        whileDrag={{ scale: 1.04, zIndex: 50, boxShadow: '0px 12px 28px rgba(0,0,0,0.22)' }}
                        drag
                        dragSnapToOrigin
                        dragMomentum={false}
                        onDragEnd={(e) => {
                          const pe = e as PointerEvent;
                          const el = document
                            .elementsFromPoint(pe.clientX, pe.clientY)
                            .find((n) => (n as HTMLElement).dataset?.day) as HTMLElement | undefined;
                          if (el) {
                            const target = new Date(Number(el.dataset.day));
                            if (!isSameDay(target, new Date(ev.start))) onMoveToDay(ev.id, target);
                          }
                        }}
                        onClick={(e) => onOpen(ev.id, (e.currentTarget as HTMLElement).getBoundingClientRect())}
                        className={
                          'relative flex h-[18px] cursor-default select-none items-center gap-1.5 overflow-hidden rounded-[4px] px-1.5 text-[11px] ' +
                          (ev.allDay || sel ? 'pl-[7px] font-semibold' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]')
                        }
                        style={ev.allDay || sel ? { background: st.background, color: st.color } : undefined}
                      >
                        {ev.allDay || sel ? (
                          <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: st.accent }} />
                        ) : (
                          <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: CAL[ev.calendar].color }} />
                        )}
                        <span className="flex-1 truncate text-neutral-800 dark:text-neutral-200" style={ev.allDay || sel ? { color: st.color } : undefined}>
                          {ev.title}
                        </span>
                        {!ev.allDay && (
                          <span className="hidden shrink-0 tabular-nums text-neutral-500 lg:inline" style={sel ? { color: st.color } : undefined}>
                            {fmtTime(new Date(ev.start))}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {list.length > MAX && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onDayClick(d)}
                    className="w-full rounded px-1.5 text-left text-[11px] font-medium text-neutral-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    {list.length - MAX} more
                  </motion.button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
