import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { TAP } from '../lib/motion';

/** Toolbar-style icon/text button with hover highlight and tactile press. */
export const Press = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(function Press(
  { className = '', ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={TAP}
      className={
        'inline-flex select-none items-center justify-center rounded-md text-neutral-700 transition-colors ' +
        'hover:bg-black/[0.06] active:bg-black/[0.09] dark:text-neutral-200 dark:hover:bg-white/[0.08] dark:active:bg-white/[0.12] ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/50 ' +
        className
      }
      {...props}
    />
  );
});

export const ICON = { size: 16, strokeWidth: 1.5 } as const;
