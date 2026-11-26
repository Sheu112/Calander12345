import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { CALENDARS } from '../lib/calendars';
import { SPRING, TAP } from '../lib/motion';
import type { CalendarId } from '../lib/types';
import { MiniMonth } from './MiniMonth';

interface Props {
  open: boolean;
  selected: Date;
  today: Date;
  eventDays: Set<string>;
  enabled: Record<CalendarId, boolean>;
  counts: Record<CalendarId, number>;
  onToggle: (id: CalendarId) => void;
  onSelectDate: (d: Date) => void;
  onClose: () => void;
}

// framer-motion 11 mistypes pathLength in targets; the runtime accepts numbers.
const checkVariants = { on: { pathLength: 1, opacity: 1 }, off: { pathLength: 0, opacity: 0 } } as unknown as Variants;

function Check({ on, color }: { on: boolean; color: string }) {
  return (
    <motion.span
      initial={false}
      animate={{ backgroundColor: on ? color : 'rgba(0,0,0,0)', borderColor: color }}
      transition={SPRING}
      className="relative flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px]"
    >
      <svg viewBox="0 0 12 12" className="h-[11px] w-[11px]" fill="none">
        <motion.path
          d="M2.5 6.2 L5 8.6 L9.6 3.6"
          stroke="white"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          variants={checkVariants}
          animate={on ? 'on' : 'off'}
          transition={SPRING}
        />
      </svg>
    </motion.span>
  );
}

export function Sidebar({ open, selected, today, eventDays, enabled, counts, onToggle, onSelectDate, onClose }: Props) {
  return (
    <>
      {/* Small screens: dim backdrop when the drawer overlays the grid */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/20 sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      <motion.aside
        initial={false}
        animate={{ width: open ? 260 : 0 }}
        transition={SPRING}
        className="relative z-[70] h-full shrink-0 overflow-hidden max-sm:fixed max-sm:inset-y-0 max-sm:left-0"
        aria-hidden={!open}
      >
        {/* soft wallpaper tint for the glass to pick up */}
        <div className="wallpaper pointer-events-none absolute inset-0 w-[260px] overflow-hidden">
          <div className="absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#AF52DE]/20 blur-3xl" />
          <div className="absolute -right-10 top-72 h-48 w-48 rounded-full bg-[#007AFF]/20 blur-3xl" />
          <div className="absolute bottom-10 left-6 h-40 w-40 rounded-full bg-[#34C759]/15 blur-3xl" />
        </div>
        <div className="glass hairline sidebar-inner titlebar-drag relative flex h-full w-[260px] flex-col border-r pt-3">
          <MiniMonth selected={selected} today={today} eventDays={eventDays} onSelect={onSelectDate} />

          <div className="mx-4 my-3 h-px bg-black/[0.08] dark:bg-white/[0.1]" />

          <div className="px-3">
            <div className="px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Calendars</div>
            {CALENDARS.map((c) => (
              <motion.button
                key={c.id}
                type="button"
                whileTap={TAP}
                onClick={() => onToggle(c.id)}
                className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-[5px] text-left text-[13px] text-neutral-800 transition-colors hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/[0.07]"
                role="checkbox"
                aria-checked={enabled[c.id]}
              >
                <Check on={enabled[c.id]} color={c.color} />
                <span className="flex-1">{c.name}</span>
                <span className="text-[11px] tabular-nums text-neutral-400">{counts[c.id]}</span>
              </motion.button>
            ))}
          </div>

          <div className="mt-auto px-5 pb-4 text-[11px] leading-relaxed text-neutral-400">
            Drag on the grid to create · Double-click for a 1-hour event · <span className="font-medium">T</span> today ·{' '}
            <span className="font-medium">←/→</span> navigate · <span className="font-medium">D W M Y</span> views
          </div>
        </div>
      </motion.aside>
    </>
  );
}
