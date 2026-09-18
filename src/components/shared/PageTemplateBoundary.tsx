import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

export type PageTemplateKind = 'list' | 'grid' | 'dashboard' | 'timeline';

interface PageTemplateBoundaryProps {
  kind: PageTemplateKind;
  children: ReactNode;
}

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const reducedTransition = { duration: 0.2 };

const kindVariants = {
  list: {
    initial: { opacity: 0, transform: 'translateX(14px)' },
    animate: { opacity: 1, transform: 'translateX(0px)' },
    exit:    { opacity: 0, transform: 'translateX(-14px)' },
  },
  timeline: {
    initial: { opacity: 0, transform: 'translateX(14px)' },
    animate: { opacity: 1, transform: 'translateX(0px)' },
    exit:    { opacity: 0, transform: 'translateX(-14px)' },
  },
  dashboard: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
  },
  grid: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
  },
} as const;

const spring = { type: 'spring' as const, damping: 30, stiffness: 360, mass: 0.7 };

/** Route-level design contract. The wrapper is a real element (not display:contents)
 * so framer-motion can animate transform/opacity. Children inherit the selected
 * template's density and geometry tokens via CSS custom properties. */
function PageTemplateBoundary({ kind, children }: PageTemplateBoundaryProps) {
  const v = kindVariants[kind];

  return (
    <motion.div
      className={`min-h-full page-template-${kind}`}
      data-page-template={kind}
      variants={v}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={prefersReduced ? reducedTransition : spring}
    >
      {children}
    </motion.div>
  );
}

export default PageTemplateBoundary;
