/**
 * Shared Framer Motion variants — all animations disabled (zero duration).
 * motion.* components render instantly at their final state.
 */

export const pageIn = {
  initial: {},
  animate: {},
  transition: { duration: 0 },
};

export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

export const listItem = {
  hidden: {},
  show: { transition: { duration: 0 } },
};

export const cardHover = {
  whileHover: {},
  whileTap: {},
};

export const btnTap = {
  whileTap: {},
};

export const fadeIn = {
  hidden: {},
  show: { transition: { duration: 0 } },
};

export const slideUp = {
  hidden: {},
  show: { transition: { duration: 0 } },
};
