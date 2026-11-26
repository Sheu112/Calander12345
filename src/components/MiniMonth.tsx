import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addMonths, dayKey, isSameDay, isSameMonth, monthGrid, MONTHS, startOfMonth, WEEKDAYS_MINI } from '../lib/date';
import { SPRING } from '../lib/motion';
import { ICON, Press } from './ui';

interface Props {
  selected: Date;
  today: Date;
  eventDays: Set<string>;
  onSelect: (d: Date) => void;
}

export function MiniMonth({ selected, today, eventDays, onSelect }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(selected));
  const [dir, setDir] = useState(0);

  // Follow the main view when it moves to another month.
  useEffect(() => {
    setMonth((m) => {
      if (isSameMonth(m, selected)) return m;
      setDir(selected > m ? 1 : -1);
      return startOfMonth(selected);
    });
  }, [selected]);

  const step = (n: number) => {
    setDir(n);
    setMonth((m) => addMonths(m, n));
  };

  const days = monthGrid(month);

  return (
    <div className="px-3">
      <div className="mb-1 flex items-center justify-between pl-1.5">
        <div className="relative h-5 flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={month.getTime()}
              custom={dir}
              initial={{ opacity: 0, y: dir * 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dir * -10 }}
              transition={SPRING}
              className="text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100"
            >
              {MONTHS[month.getMonth()]} <span className="font-normal text-neutral-500">{month.getFullYear()}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        <Press aria-label="Previous month" className="h-6 w-6" onClick={() => step(-1)}>
          <ChevronLeft {...ICON} size={14} />
        </Press>
        <Press aria-label="Next month" className="h-6 w-6" onClick={() => step(1)}>
          <ChevronRight {...ICON} size={14} />
        </Press>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-neutral-400">
        {WEEKDAYS_MINI.map((w, i) => (
          <div key={i} className="py-1">{w}</div>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={month.getTime()}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={SPRING}
            className="grid grid-cols-7"
          >
            {days.map((d) => {
              const isSel = isSameDay(d, selected);
              const isToday = isSameDay(d, today);
              const inMonth = isSameMonth(d, month);
              const color = isSel
                ? isToday
                  ? 'text-white'
                  : 'text-white dark:text-neutral-900'
                : isToday
                  ? 'text-[#FF3B30] font-semibold'
                  : inMonth
                    ? 'text-neutral-800 dark:text-neutral-200'
                    : 'text-neutral-400/70 dark:text-neutral-600';
              return (
                <motion.button
                  key={d.getTime()}
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => onSelect(d)}
                  className="group relative flex h-8 items-center justify-center"
                >
                  <span className="absolute inset-[3px] rounded-full transition-colors group-hover:bg-black/[0.06] dark:group-hover:bg-white/[0.08]" />
                  {isSel && (
                    <motion.span
                      layoutId="miniMonthPill"
                      transition={SPRING}
                      className={
                        'absolute inset-[3px] rounded-full ' +
                        (isToday ? 'bg-[#FF3B30]' : 'bg-neutral-800 dark:bg-neutral-100')
                      }
                    />
                  )}
                  <span className={'relative text-[12px] tabular-nums ' + color + (isSel ? ' font-semibold' : '')}>
                    {d.getDate()}
                  </span>
                  {eventDays.has(dayKey(d)) && !isSel && inMonth && (
                    <span className="absolute bottom-[3px] h-[3px] w-[3px] rounded-full bg-neutral-400/80" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
