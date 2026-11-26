import { AnimatePresence, motion } from 'framer-motion';
import { Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CAL } from '../lib/calendars';
import { fmtTime } from '../lib/date';
import { SPRING, TAP } from '../lib/motion';
import type { CalEvent, Rect } from '../lib/types';
import { ICON } from './ui';

interface Props {
  events: CalEvent[];
  onPick: (ev: CalEvent, anchor: Rect) => void;
}

function highlight(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-[#FF9500]/30 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function Search({ events, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 60);
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Cmd/Ctrl+F or "/" opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.('input,textarea');
      if (((e.metaKey || e.ctrlKey) && e.key === 'f') || (!typing && e.key === '/')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => { setOpen(true); input.current?.focus(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('calendar:search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('calendar:search', onOpen);
    };
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return events
      .filter((e) => [e.title, e.location, e.notes].some((f) => f?.toLowerCase().includes(s)))
      .sort((a, b) => a.start - b.start)
      .slice(0, 8);
  }, [events, q]);

  return (
    <div ref={wrap} className="relative">
      <motion.div
        initial={false}
        animate={{ width: open ? 220 : 32 }}
        transition={SPRING}
        className={
          'flex h-8 items-center overflow-hidden rounded-lg transition-colors ' +
          (open ? 'bg-black/[0.05] ring-1 ring-black/[0.06] dark:bg-white/[0.08] dark:ring-white/[0.08]' : '')
        }
      >
        <motion.button
          type="button"
          whileTap={TAP}
          aria-label="Search"
          onClick={() => { setOpen(true); input.current?.focus(); }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-700 hover:bg-black/[0.06] dark:text-neutral-200 dark:hover:bg-white/[0.08]"
        >
          <SearchIcon {...ICON} />
        </motion.button>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events"
          tabIndex={open ? 0 : -1}
          className="min-w-0 flex-1 bg-transparent pr-1 text-[13px] outline-none placeholder:text-neutral-400"
        />
        <AnimatePresence>
          {open && q && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              whileTap={TAP}
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-400/70 text-white"
            >
              <X size={10} strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {open && q.trim() && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={SPRING}
            style={{ transformOrigin: 'top right' }}
            className="hairline absolute right-0 top-10 z-50 w-[300px] bg-white/95 backdrop-blur-xl dark:bg-[#2C2C2E]/95 overflow-hidden rounded-xl border p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)]"
          >
            {results.length === 0 ? (
              <div className="px-3 py-6 text-center text-[13px] text-neutral-500">No events match “{q.trim()}”</div>
            ) : (
              <motion.ul layout>
                <AnimatePresence initial={false}>
                  {results.map((ev) => {
                    const s = new Date(ev.start);
                    return (
                      <motion.li
                        key={ev.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING}
                      >
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setOpen(false);
                            onPick(ev, { left: r.left, top: r.top, width: r.width, height: r.height });
                          }}
                          className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                        >
                          <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: CAL[ev.calendar].color }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                              {highlight(ev.title, q.trim())}
                            </span>
                            <span className="block truncate text-[11px] tabular-nums text-neutral-500">
                              {s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              {' · '}
                              {ev.allDay ? 'All-day' : fmtTime(s)}
                              {ev.location ? ` · ${ev.location}` : ''}
                            </span>
                          </span>
                        </motion.button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
