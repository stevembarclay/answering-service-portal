/**
 * Spacing System — Institutional-Grade Design
 *
 * PRIMARY TARGET: 27" monitor (1920–2560px CSS pixels)
 * Secondary: Laptop (~1280–1536px) | Tertiary: iPad (~768–1024px)
 *
 * Strategy: LARGE-FIRST (not mobile-first)
 *   - Default classes (no prefix) = 27" monitor layout
 *   - max-2xl: / max-xl: = laptop adaptations
 *   - max-lg: / max-md: = iPad and smaller adaptations
 *   - Breakpoints: 3xl=1920px, 4xl=2560px (defined in globals.css @theme)
 *
 * Enforces strict 8px grid system. 32px gap is the "comfortable" standard on 27".
 */

export const spacing = {
  // Component internal spacing
  compact: {
    padding: 'p-4',        // 16px - tight cards, iPad/small viewports
    gap: 'gap-2',          // 8px - tight lists
  },
  comfortable: {
    padding: 'p-6',        // 24px - standard cards
    gap: 'gap-6',          // 24px - standard lists (was gap-4, bumped for 27")
  },
  spacious: {
    padding: 'p-8',        // 32px - featured cards on 27" (PRIMARY)
    gap: 'gap-8',          // 32px - generous breathing room on 27"
  },

  // Page-level spacing (27" primary — more generous vertical rhythm)
  page: {
    header: 'mb-8',        // 32px below page header
    section: 'mb-10',      // 40px between major sections
    grid: 'gap-8',         // 32px between grid items
  },

  // Vertical rhythm for content
  stack: {
    tight: 'space-y-2',    // 8px - related items (title + description)
    base: 'space-y-4',     // 16px - standard stack (form fields)
    relaxed: 'space-y-8',  // 32px - section spacing
    loose: 'space-y-12',   // 48px - major sections
  },
} as const

export const cardSpacing = {
  // Standard card (MOST COMMON)
  header: 'px-6 pt-6 pb-4',     // 24px sides, 24px top, 16px bottom
  content: 'px-6 pb-6',          // 24px all around, no top (follows header)
  standalone: 'p-6',             // 24px when no header/footer

  // Compact card (list items, small cards)
  headerCompact: 'px-5 pt-5 pb-3',  // 20px sides, 20px top, 12px bottom
  contentCompact: 'px-5 pb-5',       // 20px
  standaloneCompact: 'p-5',          // 20px

  // Empty states
  empty: 'py-16 px-6',           // 64px vertical, 24px horizontal

  // Card with icon + content
  iconCard: 'p-5 flex items-center gap-4',  // 20px padding, 16px gap
} as const

export const pageLayout = {
  // Page wrapper — ALL pages use this
  container: 'space-y-10',       // 40px between major sections

  // Page header section
  header: {
    wrapper: 'space-y-3',        // 12px between title and description
    actions: 'flex items-center gap-4',  // 16px between buttons
  },

  // Content sections
  section: {
    wrapper: 'space-y-8',        // 32px within a section
    header: 'mb-6',              // 24px below section header
  },

  // Page layout tokens
  // Named @utility classes defined in globals.css (arbitrary bracket values aren't scanned in .ts files)
  contentMaxWidth: 'max-w-content mx-auto',       // Standard content width (1088px) — marketing text
  wideMaxWidth: 'max-w-wide mx-auto',             // Wide content (1792px) — primary app content on 27"
  narrowMaxWidth: 'max-w-narrow mx-auto',         // Narrow text width (672px)
  ultraNarrowMaxWidth: 'max-w-ultra-narrow mx-auto', // Ultra-narrow width (512px)
  heroMaxWidth: 'max-w-hero mx-auto',             // Hero text width (864px)
  sectionPadding: 'py-24',                        // Standard section vertical padding
  sectionBorder: 'border-t border-slate-200/50',  // Standard section divider
} as const

export const gridLayouts = {
  // Dashboard stats — 27"-first: 4 col default → 2 col laptop/small → 1 col iPad
  stats: 'grid grid-cols-4 max-xl:grid-cols-2 max-md:grid-cols-1 gap-8 max-xl:gap-6',

  // Lists (single column with generous gap)
  list: 'grid gap-6',

  // Two-column layout — 27"-first: 2 col default → 1 col iPad
  twoCol: 'grid grid-cols-2 max-lg:grid-cols-1 gap-8 max-xl:gap-6',

  // Three-column grid — 27"-first: 3 col → 2 col laptop → 1 col iPad
  threeCol: 'grid grid-cols-3 max-xl:grid-cols-2 max-lg:grid-cols-1 gap-8 max-xl:gap-6',

  // Five-column grid — for pages with 5 stat cards on 27"
  fiveCol: 'grid grid-cols-5 max-2xl:grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1 gap-8 max-xl:gap-6',
} as const

/**
 * Implementation Rules:
 *
 * PRIMARY TARGET: 27" monitor (1920–2560px). Design for large first.
 *
 * 1. Everything snaps to 4px — no 5px, 7px, 9px values
 * 2. Prefer 8px multiples — 8, 16, 24, 32, 40, 48, 64
 * 3. 32px (gap-8) is the "comfortable" grid gap on 27" (PRIMARY)
 * 4. 40px separates major sections on 27"
 * 5. Use max-xl: / max-lg: / max-md: for laptop/iPad/mobile adaptations
 * 6. Avoid arbitrary values — use defined spacing constants
 */
