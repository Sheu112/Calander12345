import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Moon, PanelLeft, Plus, Sun } from 'lucide-react';
import { SPRING, TAP } from '../lib/motion';
import type { CalEvent, Rect, ViewMode } from '../lib/types';
import { Search } from './Search';
import { ICON, Press } from './ui';

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

interface Props {
  view: ViewMode;
  title: { strong: string; light: string };
  dir: number;
  dark: boolean;
  events: CalEvent[];
  onToggleSidebar: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onView: (v: ViewMode) => void;
  onAdd: (anchor: Rect) => void;
  onToggleDark: () => void;
  onSearchPick: (ev: CalEvent, anchor: Rect) => void;
  /** Leave room for macOS traffic lights when the sidebar is collapsed. */
  trafficInset: boolean;
}

export function Toolbar(p: Props) {
  return (
    <motion.header
      initial={false}
      animate={{ paddingLeft: p.trafficInset ? 84 : 12 }}
      transition={SPRING}
      className="glass hairline titlebar-drag relative z-20 flex h-[52px] shrink-0 items-center gap-2 border-b pr-3"
    >
      {/* Left */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Press aria-label="Toggle sidebar" className="h-8 w-8" onClick={p.onToggleSidebar}>
          <PanelLeft {...ICON} />
        </Press>
        <div className="flex h-8 items-center rounded-lg bg-black/[0.05] p-[2px] dark:bg-white/[0.08]">
          <Press aria-label="Previous" className="h-7 w-7" onClick={p.onPrev}>
            <ChevronLeft {...ICON} />
          </Press>
          <Press className="h-7 px-2.5 text-[13px] font-medium" onClick={p.onToday}>
            Today
          </Press>
          <Press aria-label="Next" className="h-7 w-7" onClick={p.onNext}>
            <ChevronRight {...ICON} />
          </Press>
        </div>
        <div className="relative ml-1.5 hidden h-7 min-w-0 flex-1 overflow-hidden md:block">
          <AnimatePresence initial={false} custom={p.dir} mode="popLayout">
            <motion.h1
              key={p.title.strong + p.title.light}
              custom={p.dir}
              initial={{ opacity: 0, y: p.dir >= 0 ? 12 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: p.dir >= 0 ? -12 : 12 }}
              transition={SPRING}
              className="truncate text-[19px] leading-7 tracking-tight tabular-nums text-neutral-900 dark:text-white"
            >
              <span className="font-bold">{p.title.strong}</span>{' '}
              <span className="font-normal text-neutral-500 dark:text-neutral-400">{p.title.light}</span>
            </motion.h1>
          </AnimatePresence>
        </div>
      </div>

      {/* Center: segmented control */}
      <div className="flex h-8 items-center rounded-lg bg-black/[0.05] p-[2px] dark:bg-white/[0.08]" role="tablist">
        {VIEWS.map((v) => {
          const active = p.view === v.id;
          return (
            <motion.button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              whileTap={TAP}
              onClick={() => p.onView(v.id)}
              className={
                'relative h-7 rounded-[7px] px-2.5 text-[13px] transition-colors sm:px-3.5 ' +
                (active
                  ? 'font-medium text-neutral-900 dark:text-white'
                  : 'text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/[0.06] dark:hover:text-white')
              }
            >
              {active && (
                <motion.span
                  layoutId="activeViewPill"
                  transition={SPRING}
                  className="absolute inset-0 rounded-[7px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.06)] dark:bg-[#636366]"
                />
              )}
              <span className="relative">{v.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex flex-1 items-center justify-end gap-1">
        <Press
          aria-label="New event"
          className="h-8 w-8"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            p.onAdd({ left: r.left, top: r.top, width: r.width, height: r.height });
          }}
        >
          <Plus {...ICON} size={18} />
        </Press>
        <Search events={p.events} onPick={p.onSearchPick} />
        <Press aria-label="Toggle dark mode" className="relative h-8 w-8 overflow-hidden" onClick={p.onToggleDark}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={p.dark ? 'moon' : 'sun'}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={SPRING}
              className="flex"
            >
              {p.dark ? <Moon {...ICON} /> : <Sun {...ICON} />}
            </motion.span>
          </AnimatePresence>
        </Press>
      </div>
    </motion.header>
  );
}
