/**
 * Design System - Barrel Export
 *
 * Typography and Icon wrapper components for design system adoption.
 */

// Typography wrapper components
export {
  Heading,
  Text,
  Data,
  headingStyles,
  bodyStyles,
  dataStyles,
} from './Typography'

export type { HeadingLevel, BodySize, DataSize } from './Typography'

// Icon wrapper components
export {
  Icon,
  SuccessIcon,
  ErrorIcon,
  WarningIcon,
  InfoIcon,
} from './Icon'

export type { IconSize, IconWeight, StatusWeight, IconProps } from './Icon'

// Status indicator components
export { StatusIcon, InlineStatus } from './StatusIcon'

export type { StatusType, StatusIconProps, InlineStatusProps } from './StatusIcon'

// Generic UI components
export { StatusIndicator } from './StatusIndicator'
export type { StatusType as StatusIndicatorType, StatusTier } from './StatusIndicator'
export { PremiumEmptyState } from './PremiumEmptyState'
export { ProgressRing } from './ProgressRing'
export { DualToneIcon } from './DualToneIcon'
