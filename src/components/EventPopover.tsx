import { AnimatePresence, motion } from 'framer-motion';
import { AlignLeft, Clock, MapPin, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CALENDARS, CAL } from '../lib/calendars';
import { addDays, startOfDay, toDateInput, toTimeInput } from '../lib/date';
import { SPRING, TAP } from '../lib/motion';
import type { CalEvent, Rect } from '../lib/types';

interface Props {
  event: CalEvent;
  anchor: Rect;
  isNew: boolean;
  onChange: (patch: Partial<CalEvent>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const W = 344;
const GAP = 10;
const PAD = 12;

function parseDate(v: string) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function withTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
}

export function EventPopover({ event, anchor, isNew, onChange, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [h, setH] = useState(420);

  useLayoutEffect(() => {
    if (ref.current) setH(ref.current.offsetHeight);
  }, [event.allDay]);

  // Keep latest callbacks in a ref so listeners are bound once per popover.
  const cb = useRef({ onClose, onDelete });
  cb.current = { onClose, onDelete };

  useEffect(() => {
    if (isNew) setTimeout(() => titleRef.current?.select(), 30);
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) cb.current.onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cb.current.onClose();
      if ((e.key === 'Backspace' || e.key === 'Delete') && !(e.target as HTMLElement).closest('input,textarea')) cb.current.onDelete();
    };
    // defer so the click that opened us doesn't close us
    const t = setTimeout(() => window.addEventListener('pointerdown', onDown), 0);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [isNew]);

  // Anchor beside the event, flipping to whichever side has room.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let side: 'right' | 'left' | 'below' = 'right';
  let left = anchor.left + anchor.width + GAP;
  if (left + W > vw - PAD) {
    side = 'left';
    left = anchor.left - GAP - W;
  }
  if (left < PAD) {
    side = 'below';
    left = Math.min(Math.max(anchor.left + anchor.width / 2 - W / 2, PAD), vw - W - PAD);
  }
  let top = side === 'below' ? anchor.top + anchor.height + GAP : anchor.top + Math.min(anchor.height, 40) / 2 - 40;
  top = Math.min(Math.max(top, PAD), Math.max(PAD, vh - h - PAD));
  const originY = Math.min(Math.max(anchor.top + Math.min(anchor.height, 40) / 2 - top, 0), h);
  const origin =
    side === 'right' ? `0px ${originY}px` : side === 'left' ? `${W}px ${originY}px` : `${anchor.left + anchor.width / 2 - left}px 0px`;

  const s = new Date(event.start);
  const e = new Date(event.end);
  const cal = CAL[event.calendar];
  const lastDay = event.allDay ? addDays(e, -1) : e;

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Event details"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.14 } }}
      transition={SPRING}
      style={{ left, top, width: W, transformOrigin: origin }}
      className="fixed z-[60] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl border border-black/[0.08] bg-white/80 p-4 text-neutral-900 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.35),0_4px_14px_rgba(0,0,0,0.08)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#2C2C2E]/80 dark:text-neutral-100"
    >
      <div className="flex items-start gap-2.5">
        <motion.span
          className="mt-[9px] h-3 w-3 shrink-0 rounded-full"
          animate={{ backgroundColor: cal.color }}
          transition={SPRING}
        />
        <input
          ref={titleRef}
          value={event.title}
          onChange={(ev) => onChange({ title: ev.target.value })}
          onKeyDown={(ev) => ev.key === 'Enter' && onClose()}
          placeholder="New Event"
          className="w-full bg-transparent text-[19px] font-semibold tracking-tight outline-none placeholder:text-neutral-400"
        />
      </div>

      <label className="mt-3 flex items-center gap-2">
        <MapPin size={15} strokeWidth={1.5} className="shrink-0 text-neutral-400" />
        <input
          value={event.location ?? ''}
          onChange={(ev) => onChange({ location: ev.target.value })}
          placeholder="Add Location or Video Call"
          className="field"
        />
      </label>

      <div className="hairline my-3 border-t" />

      {/* Calendar selector */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-neutral-500">Calendar</span>
        <div className="flex items-center gap-1.5">
          {CALENDARS.map((c) => {
            const active = c.id === event.calendar;
            return (
              <motion.button
                key={c.id}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={active}
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.12 }}
                onClick={() => onChange({ calendar: c.id })}
                className="relative flex h-6 w-6 items-center justify-center"
              >
                {active && (
                  <motion.span
                    layoutId="calendarRing"
                    transition={SPRING}
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: c.color }}
                  />
                )}
                <motion.span
                  animate={{ scale: active ? 0.85 : 1 }}
                  transition={SPRING}
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ background: c.color }}
                />
              </motion.button>
            );
          })}
        </div>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={cal.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={SPRING}
          className="mt-0.5 text-right text-[11px] font-medium"
          style={{ color: cal.color }}
        >
          {cal.name}
        </motion.div>
      </AnimatePresence>

      <div className="hairline my-3 border-t" />

      {/* Time */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px]">
          <Clock size={15} strokeWidth={1.5} className="text-neutral-400" /> All-day
        </span>
        <motion.button
          type="button"
          role="switch"
          aria-checked={!!event.allDay}
          whileTap={TAP}
          onClick={() => {
            if (event.allDay) {
              const st = new Date(event.start);
              st.setHours(9, 0, 0, 0);
              onChange({ allDay: false, start: st.getTime(), end: st.getTime() + 3600000 });
            } else {
              const sd = startOfDay(s);
              const ed = startOfDay(new Date(event.end - 1));
              onChange({ allDay: true, start: sd.getTime(), end: addDays(ed, 1).getTime() });
            }
          }}
          className={'relative h-[22px] w-[38px] rounded-full transition-colors ' + (event.allDay ? 'bg-[#34C759]' : 'bg-black/[0.12] dark:bg-white/[0.18]')}
        >
          <motion.span
            initial={false}
            animate={{ x: event.allDay ? 18 : 2 }}
            transition={SPRING}
            className="absolute left-0 top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
          />
        </motion.button>
      </div>

      <div className="mt-2.5 grid grid-cols-[40px_1fr_auto] items-center gap-x-2 gap-y-1.5 text-[12px] tabular-nums">
        <span className="text-neutral-500">starts</span>
        <input
          type="date"
          value={toDateInput(s)}
          onChange={(ev) => {
            if (!ev.target.value) return;
            const day = parseDate(ev.target.value);
            const delta = day.getTime() - startOfDay(s).getTime();
            onChange({ start: event.start + delta, end: event.end + delta });
          }}
          className="field tabular-nums"
        />
        {!event.allDay ? (
          <input
            type="time"
            step={900}
            value={toTimeInput(s)}
            onChange={(ev) => {
              if (!ev.target.value) return;
              const ns = withTime(s, ev.target.value);
              onChange({ start: ns, end: ns + (event.end - event.start) });
            }}
            className="field w-[118px] tabular-nums"
          />
        ) : <span />}
        <span className="text-neutral-500">ends</span>
        <input
          type="date"
          value={toDateInput(lastDay)}
          onChange={(ev) => {
            if (!ev.target.value) return;
            const day = parseDate(ev.target.value);
            if (event.allDay) {
              onChange({ end: Math.max(addDays(day, 1).getTime(), event.start + 86400000) });
            } else {
              const ne = withTime(day, toTimeInput(e));
              onChange({ end: Math.max(ne, event.start + 15 * 60000) });
            }
          }}
          className="field tabular-nums"
        />
        {!event.allDay ? (
          <input
            type="time"
            step={900}
            value={toTimeInput(e)}
            onChange={(ev) => {
              if (!ev.target.value) return;
              const ne = withTime(e, ev.target.value);
              onChange({ end: ne > event.start ? ne : event.start + 15 * 60000 });
            }}
            className="field w-[118px] tabular-nums"
          />
        ) : <span />}
      </div>

      <div className="hairline my-3 border-t" />

      <label className="flex items-start gap-2">
        <AlignLeft size={15} strokeWidth={1.5} className="mt-1.5 shrink-0 text-neutral-400" />
        <textarea
          value={event.notes ?? ''}
          onChange={(ev) => onChange({ notes: ev.target.value })}
          placeholder="Add Notes"
          rows={3}
          className="field resize-none"
        />
      </label>

      <div className="mt-3.5 flex items-center justify-between">
        <motion.button
          type="button"
          whileTap={TAP}
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-[#FF3B30] transition-colors hover:bg-[#FF3B30]/10"
        >
          <Trash2 size={14} strokeWidth={1.5} /> Delete Event
        </motion.button>
        <motion.button
          type="button"
          whileTap={TAP}
          onClick={onClose}
          className="rounded-md bg-[#007AFF] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-colors hover:bg-[#0A84FF]"
        >
          Done
        </motion.button>
      </div>
    </motion.div>
  );
}
