import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { CAL, pillStyle } from '../lib/calendars';
import {
  addDays, atMinutes, clamp, fmtHour, fmtTime, fmtTimeRange, isSameDay, minutesOfDay, startOfDay, WEEKDAYS_SHORT,
} from '../lib/date';
import { SPRING } from '../lib/motion';
import type { CalEvent, Rect } from '../lib/types';

const HOUR = 48;
const PPM = HOUR / 60;
const DAY_MIN = 1440;
const ROW = 22; // all-day row height
const snap = (m: number) => Math.round(m / 15) * 15;
const floor15 = (m: number) => Math.floor(m / 15) * 15;

/** Remember scroll position across week/day transitions. */
let savedScroll = 7.5 * HOUR;

interface Props {
  days: Date[];
  events: CalEvent[];
  now: Date;
  dark: boolean;
  selectedId: string | null;
  newCalendar: CalEvent['calendar'];
  onCreate: (start: Date, end: Date, allDay: boolean, anchor: Rect) => void;
  onOpen: (id: string, anchor: Rect) => void;
  onMove: (id: string, start: number, end: number) => void;
  onDayClick: (d: Date) => void;
}

type Drag =
  | { kind: 'create'; day: number; anchor: number; cur: number; x0: number; y0: number; active: boolean }
  | {
      kind: 'move'; id: string; st0: number; en0: number; s0: number; dur: number; pDay0: number;
      x0: number; y0: number; dDay: number; dMin: number; active: boolean; rect: Rect;
    }
  | { kind: 'resize'; id: string; st0: number; en0: number; y0: number; dMin: number; active: boolean };

interface Seg {
  key: string;
  ev: CalEvent;
  day: number;
  s: number;
  e: number;
  col: number;
  cols: number;
}

const toRect = (r: DOMRect): Rect => ({ left: r.left, top: r.top, width: r.width, height: r.height });

/** Classic overlap layout: clusters of overlapping events split into lanes. */
function layoutDay(segs: Seg[]) {
  segs.sort((a, b) => a.s - b.s || b.e - a.e);
  let cluster: Seg[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const ends: number[] = [];
    for (const sg of cluster) {
      let c = ends.findIndex((end) => end <= sg.s);
      if (c < 0) { c = ends.length; ends.push(sg.e); } else ends[c] = sg.e;
      sg.col = c;
    }
    for (const sg of cluster) sg.cols = ends.length;
    cluster = [];
  };
  for (const sg of segs) {
    if (cluster.length && sg.s >= clusterEnd) flush();
    cluster.push(sg);
    clusterEnd = Math.max(clusterEnd, sg.e);
  }
  if (cluster.length) flush();
}

export function TimeGrid({ days, events, now, dark, selectedId, newCalendar, onCreate, onOpen, onMove, onDayClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridW, setGridW] = useState(0);
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [allDayOpen, setAllDayOpen] = useState(false);
  const n = days.length;
  const colW = gridW / n || 0;
  const rangeStart = days[0].getTime();
  const rangeEnd = addDays(days[n - 1], 1).getTime();

  const setDrag = (d: Drag | null) => { dragRef.current = d; setDragState(d); };

  useLayoutEffect(() => {
    const el = scrollRef.current!;
    el.scrollTop = savedScroll;
    const g = gridRef.current!;
    setGridW(g.clientWidth);
    const ro = new ResizeObserver(() => setGridW(g.clientWidth));
    ro.observe(g);
    return () => ro.disconnect();
  }, []);

  const locate = useCallback((cx: number, cy: number) => {
    const r = gridRef.current!.getBoundingClientRect();
    return {
      day: clamp(Math.floor((cx - r.left) / (r.width / n)), 0, n - 1),
      min: clamp((cy - r.top) / PPM, 0, DAY_MIN),
    };
  }, [n]);

  const rectFor = (day: number, s: number, e: number): Rect => {
    const r = gridRef.current!.getBoundingClientRect();
    return { left: r.left + day * colW + 2, top: r.top + s * PPM, width: colW - 4, height: (e - s) * PPM };
  };

  const createRange = (d: Extract<Drag, { kind: 'create' }>) =>
    d.cur >= d.anchor
      ? { s: d.anchor, e: Math.max(d.cur, d.anchor + 15) }
      : { s: d.cur, e: d.anchor + 15 };

  const moveTimes = (d: Extract<Drag, { kind: 'move' }>) => {
    const s = clamp(d.s0 + d.dMin, 0, DAY_MIN - Math.min(d.dur, DAY_MIN));
    const st = addDays(new Date(d.st0), d.dDay).getTime() + (s - d.s0) * 60000;
    return { start: st, end: st + (d.en0 - d.st0) };
  };
  const resizeEnd = (d: Extract<Drag, { kind: 'resize' }>) => {
    const dayStart = startOfDay(new Date(d.st0));
    const endLimit = addDays(dayStart, 1).getTime();
    return clamp(d.en0 + d.dMin * 60000, d.st0 + 15 * 60000, Math.max(endLimit, d.en0));
  };

  // Global pointer tracking while an interaction is in flight.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const onMovePtr = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dist = Math.abs(e.clientX - ('x0' in d ? d.x0 : e.clientX)) + Math.abs(e.clientY - d.y0);
      const active = d.active || dist > 4;
      if (d.kind === 'create') {
        setDrag({ ...d, active, cur: snap(locate(e.clientX, e.clientY).min) });
      } else if (d.kind === 'move') {
        const pd = locate(e.clientX, e.clientY).day;
        setDrag({ ...d, active, dMin: snap((e.clientY - d.y0) / PPM), dDay: pd - d.pDay0 });
      } else {
        setDrag({ ...d, active, dMin: snap((e.clientY - d.y0) / PPM) });
      }
    };
    const onUp = () => {
      const d = dragRef.current;
      setDrag(null);
      document.body.style.cursor = '';
      if (!d) return;
      if (d.kind === 'create') {
        if (!d.active) return;
        const { s, e } = createRange(d);
        onCreate(atMinutes(days[d.day], s), atMinutes(days[d.day], e), false, rectFor(d.day, s, e));
      } else if (d.kind === 'move') {
        if (!d.active) return onOpen(d.id, d.rect);
        const t = moveTimes(d);
        if (t.start !== d.st0) onMove(d.id, t.start, t.end);
      } else {
        const end = resizeEnd(d);
        if (end !== d.en0) onMove(d.id, d.st0, end);
      }
    };
    window.addEventListener('pointermove', onMovePtr);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMovePtr);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const startCreate = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const { day, min } = locate(e.clientX, e.clientY);
    const a = floor15(min);
    setDrag({ kind: 'create', day, anchor: a, cur: a + 15, x0: e.clientX, y0: e.clientY, active: false });
  };

  const onDouble = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const { day, min } = locate(e.clientX, e.clientY);
    const s = clamp(floor15(min), 0, DAY_MIN - 60);
    onCreate(atMinutes(days[day], s), atMinutes(days[day], s + 60), false, rectFor(day, s, s + 60));
  };

  const startMove = (e: React.PointerEvent, ev: CalEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const st = new Date(ev.start);
    setDrag({
      kind: 'move', id: ev.id, st0: ev.start, en0: ev.end, s0: minutesOfDay(st), dur: (ev.end - ev.start) / 60000,
      pDay0: locate(e.clientX, e.clientY).day, x0: e.clientX, y0: e.clientY, dDay: 0, dMin: 0, active: false,
      rect: toRect((e.currentTarget as HTMLElement).getBoundingClientRect()),
    });
  };

  const startResize = (e: React.PointerEvent, ev: CalEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    document.body.style.cursor = 'ns-resize';
    setDrag({ kind: 'resize', id: ev.id, st0: ev.start, en0: ev.end, y0: e.clientY, dMin: 0, active: false });
  };

  useEffect(() => {
    if (drag?.kind === 'move' && drag.active) document.body.style.cursor = 'grabbing';
  }, [drag]);

  // Effective events = committed events with the in-flight drag applied.
  const effective = useMemo(() => {
    if (!drag || drag.kind === 'create' || !drag.active) return events;
    return events.map((ev) => {
      if (ev.id !== drag.id) return ev;
      if (drag.kind === 'move') return { ...ev, ...moveTimes(drag) };
      return { ...ev, end: resizeEnd(drag) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, drag]);

  const segs = useMemo(() => {
    const perDay: Seg[][] = days.map(() => []);
    for (const ev of effective) {
      if (ev.allDay || ev.end <= rangeStart || ev.start >= rangeEnd) continue;
      days.forEach((d, i) => {
        const ds = d.getTime();
        const de = addDays(d, 1).getTime();
        if (ev.end <= ds || ev.start >= de) return;
        const s = (Math.max(ev.start, ds) - ds) / 60000;
        const e = (Math.min(ev.end, de) - ds) / 60000;
        perDay[i].push({ key: `${ev.id}:${i === 0 || ev.start >= ds ? 'a' : i}`, ev, day: i, s, e, col: 0, cols: 1 });
      });
    }
    perDay.forEach(layoutDay);
    return perDay.flat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective, rangeStart, rangeEnd, n]);

  // All-day lanes, spanning columns.
  const allDay = useMemo(() => {
    const items = effective
      .filter((ev) => ev.allDay && ev.end > rangeStart && ev.start < rangeEnd)
      .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
      .map((ev) => {
        const c0 = days.findIndex((d) => addDays(d, 1).getTime() > ev.start);
        let c1 = n - 1;
        for (let i = n - 1; i >= 0; i--) if (days[i].getTime() < ev.end) { c1 = i; break; }
        return { ev, c0: Math.max(0, c0), c1, row: 0 };
      });
    const rows: number[][] = [];
    for (const it of items) {
      let r = rows.findIndex((cols) => cols.every((c) => c < it.c0 || c > it.c1));
      if (r < 0) { r = rows.length; rows.push([]); }
      for (let c = it.c0; c <= it.c1; c++) rows[r].push(c);
      it.row = r;
    }
    return { items, rows: rows.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective, rangeStart, rangeEnd, n]);

  const collapsible = allDay.rows > 2;
  const shownRows = collapsible && !allDayOpen ? 1 : allDay.rows;
  const hiddenPerCol = useMemo(() => {
    const counts = Array(n).fill(0);
    if (!collapsible || allDayOpen) return counts;
    for (const it of allDay.items) if (it.row >= shownRows) for (let c = it.c0; c <= it.c1; c++) counts[c]++;
    return counts;
  }, [allDay, collapsible, allDayOpen, shownRows, n]);
  const allDayH = Math.max(1, shownRows + (collapsible && !allDayOpen ? 1 : 0)) * ROW + 6;

  const todayIdx = days.findIndex((d) => isSameDay(d, now));
  const nowMin = minutesOfDay(now) + now.getSeconds() / 60;
  const nowTop = nowMin * PPM;

  const ghost = drag?.kind === 'create' && drag.active ? { day: drag.day, ...createRange(drag) } : null;
  const liftedId = drag && drag.kind !== 'create' && drag.active ? drag.id : null;
  const single = n === 1;

  return (
    <div
      ref={scrollRef}
      className="scroll-quiet h-full overflow-y-auto overflow-x-hidden"
      onScroll={(e) => (savedScroll = (e.target as HTMLElement).scrollTop)}
    >
      {/* Sticky frosted header: day names + all-day lane */}
      <div className="glass hairline sticky top-0 z-30 border-b">
        <div className="flex">
          <div className="w-14 shrink-0" />
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
            {days.map((d) => {
              const isToday = isSameDay(d, now);
              return (
                <motion.button
                  key={d.getTime()}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onDayClick(d)}
                  className={
                    'flex h-11 items-center gap-1.5 rounded-md px-2 text-[13px] transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ' +
                    (single ? 'justify-start' : 'justify-center sm:justify-end')
                  }
                >
                  <span className={isToday ? 'font-medium text-[#FF3B30]' : 'text-neutral-500 dark:text-neutral-400'}>
                    {single ? d.toLocaleDateString('en-US', { weekday: 'long' }) : WEEKDAYS_SHORT[d.getDay()]}
                  </span>
                  <span
                    className={
                      'flex h-[26px] min-w-[26px] items-center justify-center rounded-full px-1 text-[15px] tabular-nums ' +
                      (isToday ? 'bg-[#FF3B30] font-semibold text-white shadow-[0_2px_8px_rgba(255,59,48,0.35)]' : 'font-medium text-neutral-900 dark:text-neutral-100')
                    }
                  >
                    {d.getDate()}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* All-day lane */}
        <div className="hairline flex border-t">
          <div className="relative flex w-14 shrink-0 flex-col items-end pr-2 pt-[5px] text-[10px] text-neutral-400">
            <span>all-day</span>
            {collapsible && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setAllDayOpen((o) => !o)}
                className="mt-0.5 flex h-4 w-5 items-center justify-center rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                aria-label={allDayOpen ? 'Collapse all-day events' : 'Expand all-day events'}
              >
                <motion.span animate={{ rotate: allDayOpen ? 180 : 0 }} transition={SPRING} className="flex">
                  <ChevronDown size={12} strokeWidth={1.75} />
                </motion.span>
              </motion.button>
            )}
          </div>
          <motion.div
            initial={false}
            animate={{ height: allDayH }}
            transition={SPRING}
            className="relative flex-1 overflow-hidden"
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest('[data-event]')) return;
              const { day } = locate(e.clientX, e.clientY);
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onCreate(days[day], addDays(days[day], 1), true, { left: r.left + day * colW, top: r.top, width: colW, height: ROW });
            }}
          >
            {days.map((_, i) => i > 0 && (
              <div key={i} className="hairline pointer-events-none absolute inset-y-0 border-l" style={{ left: i * colW }} />
            ))}
            <AnimatePresence initial={false}>
              {allDay.items
                .filter((it) => it.row < shownRows)
                .map((it) => {
                  const st = pillStyle(it.ev, dark, it.ev.id === selectedId);
                  return (
                    <motion.div
                      key={it.ev.id}
                      data-event
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1, left: it.c0 * colW + 2, width: (it.c1 - it.c0 + 1) * colW - 4, top: it.row * ROW + 3 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={SPRING}
                      whileTap={{ scale: 0.97 }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => onOpen(it.ev.id, toRect((e.currentTarget as HTMLElement).getBoundingClientRect()))}
                      className="absolute flex h-[19px] cursor-default select-none items-center overflow-hidden rounded-[4px] pl-[7px] pr-1.5 text-[11px] font-semibold"
                      style={{ background: st.background, color: st.color }}
                    >
                      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: st.accent }} />
                      <span className="truncate">{it.ev.title}</span>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
            <AnimatePresence>
              {hiddenPerCol.map((count, c) =>
                count > 0 ? (
                  <motion.button
                    key={`more-${c}`}
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setAllDayOpen(true)}
                    className="absolute h-[19px] rounded px-2 text-left text-[11px] font-medium text-neutral-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                    style={{ left: c * colW + 2, width: colW - 4, top: shownRows * ROW + 3 }}
                  >
                    {count} more
                  </motion.button>
                ) : null,
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Time grid */}
      <div className="relative flex">
        <div className="relative w-14 shrink-0 select-none" style={{ height: 24 * HOUR }}>
          {Array.from({ length: 24 }, (_, h) => {
            const hideNearNow = todayIdx >= 0 && Math.abs(nowMin - h * 60) < 14;
            return h === 0 || hideNearNow ? null : (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-neutral-400" style={{ top: h * HOUR }}>
                {fmtHour(h)}
              </div>
            );
          })}
          {todayIdx >= 0 && (
            <motion.div
              initial={false}
              animate={{ top: nowTop }}
              transition={SPRING}
              className="absolute right-1 z-10 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#FF3B30] px-1.5 py-[1px] text-[10px] font-semibold tabular-nums text-white"
            >
              {fmtTime(now)}
            </motion.div>
          )}
        </div>

        <div
          ref={gridRef}
          className="relative flex-1 touch-pan-y select-none"
          style={{ height: 24 * HOUR }}
          onPointerDown={startCreate}
          onDoubleClick={onDouble}
        >
          {/* hour lines */}
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="hairline pointer-events-none absolute inset-x-0 border-t" style={{ top: h * HOUR }} />
          ))}
          {/* columns */}
          {days.map((d, i) => (
            <div
              key={i}
              className={
                'hairline pointer-events-none absolute inset-y-0 ' +
                (i > 0 ? 'border-l ' : '') +
                (!single && (d.getDay() === 0 || d.getDay() === 6) ? 'bg-black/[0.015] dark:bg-white/[0.015]' : '')
              }
              style={{ left: i * colW, width: colW }}
            />
          ))}

          {/* events */}
          <AnimatePresence initial={false}>
            {colW > 0 && segs.map((sg) => {
              const ev = sg.ev;
              const lifted = liftedId === ev.id;
              const laneW = (colW - 4) / sg.cols;
              const top = sg.s * PPM + 1;
              const height = Math.max((sg.e - sg.s) * PPM - 2, 17);
              const st = pillStyle(ev, dark, ev.id === selectedId && !lifted);
              const compact = height < 34;
              const start = new Date(ev.start);
              return (
                <motion.div
                  key={sg.key}
                  data-event
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{
                    opacity: 1,
                    scale: lifted ? 1.02 : 1,
                    top,
                    height,
                    left: sg.day * colW + 2 + (lifted ? 0 : sg.col * laneW),
                    width: lifted ? colW - 4 : sg.cols > 1 ? laneW - 1 : laneW,
                    boxShadow: lifted
                      ? '0px 14px 32px rgba(0,0,0,0.22), 0px 3px 8px rgba(0,0,0,0.12)'
                      : '0px 0px 0px rgba(0,0,0,0), 0px 0px 0px rgba(0,0,0,0)',
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={SPRING}
                  onPointerDown={(e) => startMove(e, ev)}
                  className={
                    'group absolute cursor-default touch-none overflow-hidden rounded-[5px] pl-[7px] pr-1 text-[11px] leading-[14px] ' +
                    (compact ? 'py-[1px]' : 'py-[3px]')
                  }
                  style={{
                    background: st.background,
                    color: st.color,
                    zIndex: lifted ? 40 : 10 + sg.col,
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  }}
                >
                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: st.accent }} />
                  {compact ? (
                    <div className="truncate">
                      <span className="font-semibold">{ev.title}</span>
                      <span className="ml-1 tabular-nums opacity-75">{fmtTime(start)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="line-clamp-2 font-semibold">{ev.title}</div>
                      <div className="truncate tabular-nums opacity-80">
                        {lifted ? fmtTimeRange(start, new Date(ev.end)) : fmtTime(start)}
                      </div>
                      {ev.location && height >= 58 && <div className="truncate opacity-75">{ev.location}</div>}
                    </>
                  )}
                  <div
                    className="absolute inset-x-0 bottom-0 h-[7px] cursor-ns-resize"
                    onPointerDown={(e) => startResize(e, ev)}
                  >
                    <div className="mx-auto mt-[2px] h-[3px] w-6 rounded-full bg-current opacity-0 transition-opacity group-hover:opacity-30" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* elastic ghost for click-and-drag creation */}
          <AnimatePresence>
            {ghost && (
              <motion.div
                key="ghost"
                initial={{ opacity: 0, scale: 0.96, top: ghost.s * PPM + 1, height: (ghost.e - ghost.s) * PPM - 2 }}
                animate={{ opacity: 1, scale: 1, top: ghost.s * PPM + 1, height: (ghost.e - ghost.s) * PPM - 2, left: ghost.day * colW + 2, width: colW - 4 }}
                exit={{ opacity: 0 }}
                transition={SPRING}
                className="pointer-events-none absolute z-40 overflow-hidden rounded-[5px] py-[3px] pl-[7px] pr-1 text-[11px] leading-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                style={{ ...(() => { const s = pillStyle({ calendar: newCalendar }, dark); return { background: s.background, color: s.color }; })() }}
              >
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: CAL[newCalendar].color }} />
                <div className="font-semibold">New Event</div>
                <div className="tabular-nums opacity-80">
                  {fmtTimeRange(atMinutes(days[ghost.day], ghost.s), atMinutes(days[ghost.day], ghost.e))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* live current-time indicator */}
          {todayIdx >= 0 && colW > 0 && (
            <motion.div
              initial={false}
              animate={{ top: nowTop }}
              transition={SPRING}
              className="pointer-events-none absolute inset-x-0 z-50"
            >
              <div className="absolute inset-x-0 h-px -translate-y-1/2 bg-[#FF3B30]/30" />
              <div className="absolute h-[1.5px] -translate-y-1/2 bg-[#FF3B30]" style={{ left: todayIdx * colW, width: colW }} />
              <div
                className="absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF3B30] shadow-[0_0_0_3px_rgba(255,59,48,0.18),0_0_10px_rgba(255,59,48,0.7)]"
                style={{ left: todayIdx * colW }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
