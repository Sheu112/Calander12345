import type { Transition } from 'framer-motion';

/** The one spring used for every interaction. */
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 };
/** Slightly softer variant for large surfaces (view layers). */
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 300, damping: 32, mass: 0.9 };
export const TAP = { scale: 0.96 };
