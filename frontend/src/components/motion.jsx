/**
 * Small motion toolkit for the marketing surfaces (Home, Register).
 *
 * Entrance and scroll reveals in the spirit of a calm health-tech site: content
 * fades in, rises a touch, and sharpens from a soft blur. Everything honours
 * prefers-reduced-motion by rendering the final state with no animation.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { loadReduceMotion } from '../lib/prefs'

// Gentle "ease-out expo" — matches the app's existing rise-in curve.
const EASE = [0.22, 1, 0.36, 1]

/**
 * True when animation should be suppressed: either the OS setting
 * (prefers-reduced-motion) or the app's own Settings toggle. Read at render;
 * navigating between pages re-mounts them, so a Settings change applies next
 * time a page is visited.
 */
export function useReduceMotion() {
  return useReducedMotion() || loadReduceMotion()
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: EASE } },
}

/** A single element that reveals once when scrolled into view. */
export function Reveal({ as = 'div', delay = 0, y = 18, className, children, ...rest }) {
  const reduce = useReduceMotion()
  const MotionTag = motion[as] ?? motion.div
  if (reduce) {
    const Tag = as
    return <Tag className={className} {...rest}>{children}</Tag>
  }
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/** Container that staggers its <StaggerItem> children as the group enters view. */
export function Stagger({ as = 'div', className, stagger = 0.09, delayChildren = 0, amount = 0.2, children, ...rest }) {
  const reduce = useReduceMotion()
  const MotionTag = motion[as] ?? motion.div
  if (reduce) {
    const Tag = as
    return <Tag className={className} {...rest}>{children}</Tag>
  }
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren } } }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/** A child of <Stagger>. Reveals in sequence with its siblings. */
export function StaggerItem({ as = 'div', className, children, ...rest }) {
  const reduce = useReduceMotion()
  if (reduce) {
    const Tag = as
    return <Tag className={className} {...rest}>{children}</Tag>
  }
  const MotionTag = motion[as] ?? motion.div
  return (
    <MotionTag className={className} variants={itemVariants} {...rest}>
      {children}
    </MotionTag>
  )
}
