/**
 * Motion System — Institutional-Grade Design
 *
 * Refined easing curves, focus states, loading transitions, and micro-interactions.
 * All animations respect prefers-reduced-motion (handled in globals.css).
 */

import { cn } from '@/lib/utils/cn'

/**
 * Easing curves for different interaction types
 */
export const easingCurves = {
  // Quick responses (buttons, toggles)
  snappy: 'transition-all duration-200 ease-out',

  // Standard interactions (cards, panels) — from globals.css
  smooth: 'transition-all duration-300 ease-smooth',

  // Deliberate movements (modals, sheets)
  elegant: 'transition-all duration-400 ease-smooth',

  // Subtle bounce (featured actions)
  spring: 'transition-all duration-400 cubic-bezier(0.34, 1.2, 0.64, 1)',
} as const

/**
 * Hover transition patterns
 */
export const hoverTransitions = {
  // Card hover — elegant lift
  card: cn(
    'transition-all duration-300 ease-smooth',
    'hover:-translate-y-1',
    'hover:shadow-institutional-hover',
  ),

  // Button hover — snappy response
  button: cn(
    'transition-all duration-200 ease-out',
    'hover:scale-[1.02]',
    'active:scale-[0.98]',
  ),

  // Nav link hover — smooth color shift
  navLink: cn(
    'transition-all duration-200 ease-out',
    'hover:text-slate-900 hover:bg-slate-50',
  ),

  // Badge hover — subtle scale
  badge: cn(
    'transition-transform duration-150 ease-out',
    'hover:scale-105',
  ),
} as const

/**
 * Enhanced focus states (Double-Ring Pattern)
 * WCAG AA compliant with 3:1 contrast minimum
 */
export const focusStyles = {
  // Primary focus (buttons, primary actions)
  primary: cn(
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-primary',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  ),

  // Card focus (keyboard navigation)
  card: cn(
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-slate-400',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'focus-visible:shadow-institutional-hover',
  ),

  // Input focus
  input: cn(
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-slate-400',
    'focus-visible:border-slate-400',
  ),

  // Secondary focus (ghost buttons, links)
  secondary: cn(
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-slate-300',
    'focus-visible:ring-offset-1',
  ),
} as const

/**
 * Loading & state transitions
 */
export const loadingStates = {
  // Skeleton with shimmer effect
  skeleton: cn(
    'bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100',
    'animate-shimmer',  // From globals.css
    'bg-[length:200%_100%]',
  ),

  // Fade-in on load
  fadeIn: 'animate-fade-in-up opacity-0',  // From globals.css

  // Fade-in with scale
  fadeInScale: 'animate-fade-in-scale opacity-0',  // From globals.css

  // Staggered list animations
  stagger: {
    item1: 'animation-delay-100',
    item2: 'animation-delay-200',
    item3: 'animation-delay-300',
    item4: 'animation-delay-400',
    item5: 'animation-delay-500',
  },
} as const

/**
 * Micro-interactions for enhanced polish
 */
export const microInteractions = {
  // Badge hover — subtle scale (non-clickable but responsive)
  badge: cn(
    'transition-transform duration-150 ease-out',
    'hover:scale-105',
    'cursor-default',
  ),

  // Icon hover in navigation
  navIcon: cn(
    'transition-all duration-200 ease-out',
    'group-hover:scale-110',
    'group-hover:text-primary',
  ),

  // Empty state icon — gentle pulse
  emptyIcon: cn(
    'animate-fade-in-scale',  // From globals.css
    'animation-delay-200',
  ),

  // Upload/Action button — press effect
  actionButton: cn(
    'transition-all duration-150 ease-out',
    'hover:shadow-lg hover:-translate-y-0.5',
    'active:translate-y-0 active:shadow-md',
    'touch-manipulation',  // Better mobile tap
  ),

  // Status card hover (dashboard)
  statusCard: cn(
    'group',
    'transition-all duration-300 ease-smooth',
    'hover:scale-[1.02]',
    'cursor-pointer',
  ),
} as const

/**
 * Page-level animations with staggered entrance
 */
export const pageAnimations = {
  // Page header — first to appear
  header: 'animate-fade-in-up animation-delay-100',

  // Stats grid — staggered entrance (100ms intervals)
  statsGrid: (index: number) => cn(
    'animate-fade-in-up',
    index === 0 && 'animation-delay-0',
    index === 1 && 'animation-delay-100',
    index === 2 && 'animation-delay-200',
    index === 3 && 'animation-delay-300',
    index === 4 && 'animation-delay-400',
    index === 5 && 'animation-delay-500',
    index === 6 && 'animation-delay-600',
    index === 7 && 'animation-delay-700',
    index === 8 && 'animation-delay-800',
  ),

  // Content sections — sequential
  section: (delay: 100 | 200 | 300 | 400 | 500 | 600 | 800 | 1000) => cn(
    'animate-fade-in-up',
    `animation-delay-${delay}`,
  ),

  // List items — staggered
  listItem: (index: number) => cn(
    'animate-fade-in-up',
    `animation-delay-${Math.min(index * 100, 500)}`,
  ),
} as const

/**
 * Complex hover states
 */
export const complexHovers = {
  // List card hover
  listCard: cn(
    'group cursor-pointer',
    'transition-all duration-300 ease-smooth',
    'hover:-translate-y-1',
    'hover:shadow-institutional-hover',
    'hover:border-slate-300',
    // Icons transition on card hover
    '[&_svg]:transition-all [&_svg]:duration-200',
    '[&_svg]:group-hover:text-primary',
  ),

  // Navigation link with background slide
  navLink: cn(
    'relative overflow-hidden',
    'before:absolute before:inset-0',
    'before:bg-slate-50 before:opacity-0',
    'before:transition-opacity before:duration-200',
    'hover:before:opacity-100',
  ),

  // Dashboard stat card with icon scale
  statCard: cn(
    'group',
    'transition-all duration-300 ease-smooth',
    'hover:scale-[1.02]',
    'cursor-pointer',
    // Icon scales on hover
    '[&_svg]:transition-transform [&_svg]:duration-200',
    '[&_svg]:group-hover:scale-110',
  ),
} as const

/**
 * Touch optimization for mobile
 */
export const touchOptimized = cn(
  'touch-manipulation',  // Prevents 300ms delay on mobile
  'select-none',         // Prevents text selection on double-tap
)

// Minimum touch target size (44x44px WCAG)
export const touchTarget = 'min-h-[44px] min-w-[44px]'

/**
 * Key Principles:
 *
 * - Refined easing curves (no more linear/basic easing)
 * - Double-ring focus states (accessibility + premium feel)
 * - Staggered animations for visual interest
 * - Subtle micro-interactions on badges, icons
 * - Touch-optimized for mobile
 * - Respect prefers-reduced-motion (already in globals.css)
 */
