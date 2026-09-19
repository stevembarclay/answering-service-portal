/**
 * Typography System — Institutional-Grade Design
 *
 * Typography tokens — define --font-heading, --font-mono, --font-body in your globals.css.
 *
 * PRIMARY TARGET: 27" monitor (1920–2560px) — use 3xl: prefix for scale-ups.
 * Secondary: Laptop | Tertiary: iPad
 *
 * Font variable conventions:
 * - var(--font-heading)  → display/serif font for headlines and editorial emphasis
 * - var(--font-body)     → sans-serif for UI, body text, and numeric data display
 * - var(--font-mono)     → monospace for code-like content only (hashes, IDs, file paths)
 *
 * Define these in globals.css @theme or as Next.js next/font CSS variables.
 * Example:
 *   @theme {
 *     --font-heading: 'Your Display Font', serif;
 *     --font-body: 'Your Sans Font', sans-serif;
 *     --font-mono: 'Your Mono Font', monospace;
 *   }
 */

export const headingStyles = {
  h1: {
    // Page titles — 27" primary (3xl: 48px) → laptop (40px) → small (32px)
    base: 'text-4xl 3xl:text-5xl max-md:text-[32px] font-bold leading-tight tracking-tight',
    // Display/serif italic for editorial authority — page titles and marketing only
    serif: 'font-[family-name:var(--font-heading)] italic font-normal text-[32px] 3xl:text-[40px] leading-tight tracking-tight',
  },
  h2: {
    // Section headers — bumped at 3xl
    base: 'text-2xl 3xl:text-[28px] font-semibold leading-snug tracking-tight',
    serif: 'font-[family-name:var(--font-heading)] text-2xl 3xl:text-[28px] font-semibold leading-snug tracking-tight',
  },
  h3: {
    // Card titles, subsections
    base: 'text-lg 3xl:text-xl font-semibold leading-6 tracking-tight',
  },
  h4: {
    // Subsection headers, labels
    base: 'text-base font-semibold leading-6 tracking-normal',
  },
} as const

export const bodyStyles = {
  large: 'text-[17px] 3xl:text-[18px] font-normal leading-relaxed',
  base: 'text-[15.5px] 3xl:text-[16.5px] font-normal leading-relaxed',
  small: 'text-[14px] 3xl:text-[15px] font-normal leading-relaxed',
  caption: 'text-[13px] 3xl:text-[14px] font-medium leading-tight',
  micro: 'text-[12px] font-medium leading-tight tracking-wide uppercase',
  nano: 'text-[11px] leading-tight',  // Sub-micro labels: detection badges, tiny UI labels
  pico: 'text-[10px] leading-none',   // Minimal text: keyboard shortcut hints
  tag: 'text-[12px] leading-tight',   // Small chips/badges (12px, no uppercase — use micro for uppercase labels)
} as const

export const navStyles = {
  // Desktop sidebar links
  link: {
    active: 'text-[15px] font-semibold tracking-tight',
    inactive: 'text-[15px] font-medium tracking-normal',
  },

  // Brand name
  brand: {
    desktop: 'text-lg font-semibold tracking-tight',
    mobile: 'text-base font-semibold tracking-tight',
  },

  // Section labels (e.g. SETTINGS, ORGANIZATION)
  sectionLabel: 'text-xs font-semibold text-slate-500 uppercase tracking-wider',

  // Organization/tenant name display
  firmName: 'text-sm font-medium text-slate-700 truncate',
} as const

export const dataStyles = {
  // Dashboard stat cards — hero numbers — 27" primary: 80px → laptop: 66px
  hero: 'text-[66px] 3xl:text-[80px] font-normal tabular-nums tracking-tight leading-none',

  // Slightly smaller hero variant
  prominent: 'text-[56px] 3xl:text-[66px] font-normal tabular-nums tracking-tight leading-none',

  // Inline counts ("12/45 linked", "100/100", scores)
  inline: 'text-sm tabular-nums',

  // Hashes, IDs, file paths — code-like content uses monospace
  micro: 'text-xs font-[family-name:var(--font-mono)] tabular-nums text-slate-500',

  // File sizes, dates
  metadata: 'text-[13px] tabular-nums text-slate-600',
} as const

/**
 * Implementation Notes:
 *
 * - var(--font-heading): Sharp display/serif for institutional aesthetic
 * - Tracking (letter-spacing): Tighter on headings for optical correction
 * - Serif usage: Strategic for editorial authority (not everywhere)
 * - Mono fonts: ONLY for code-like content (hashes, IDs). Stats use sans + tabular-nums.
 * - Line-height: leading-relaxed (1.625) for body text readability
 */
