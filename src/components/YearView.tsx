import { motion } from 'framer-motion';
import { dayKey, isSameDay, isSameMonth, monthGrid, MONTHS, WEEKDAYS_MINI } from '../lib/date';
import { SPRING } from '../lib/motion';

interface Props {
  year: number;
  now: Date;
  eventDays: Set<string>;
  onMonthClick: (d: Date) => void;
  onDayClick: (d: Date) => void;
}

export function YearView({ year, now, eventDays, onMonthClick, onDayClick }: Props) {
  return (
    <div className="scroll-quiet h-full overflow-y-auto px-4 py-5 sm:px-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTHS.map((name, m) => {
          const first = new Date(year, m, 1);
          const days = monthGrid(first);
          const current = isSameMonth(first, now);
          return (
            <motion.div
              key={m}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: m * 0.015 }}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onMonthClick(first)}
                className={'mb-1.5 rounded-md px-1 text-[17px] font-semibold transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.07] ' + (current ? 'text-[#FF3B30]' : 'text-neutral-900 dark:text-neutral-100')}
              >
                {name}
              </motion.button>
              <div className="grid grid-cols-7 text-center text-[10px] font-medium text-neutral-400">
                {WEEKDAYS_MINI.map((w, i) => <div key={i} className="py-0.5">{w}</div>)}
              </div>
              <div className="grid grid-cols-7 text-center">
                {days.map((d, i) => {
                  const inMonth = isSameMonth(d, first);
                  if (!inMonth) return <div key={i} className="h-7" />;
                  const today = isSameDay(d, now);
                  const has = eventDays.has(dayKey(d));
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={() => onDayClick(d)}
                      className={
                        'relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px] tabular-nums transition-colors ' +
                        (today ? 'bg-[#FF3B30] font-semibold text-white' : 'text-neutral-800 hover:bg-black/[0.06] dark:text-neutral-200 dark:hover:bg-white/[0.08]')
                      }
                    >
                      {d.getDate()}
                      {has && !today && <span className="absolute bottom-[2px] h-[3px] w-[3px] rounded-full bg-neutral-400" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
