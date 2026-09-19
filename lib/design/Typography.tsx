/**
 * Typography - Design System Wrapper Components
 *
 * USAGE:
 * - Heading: page titles (h1), section headers (h2-h4). Use serif for editorial emphasis.
 * - Text: body copy. Sizes: large (descriptions), base (default), small (metadata), caption, micro.
 * - Data: numeric/data display. Sizes: hero (dashboard stats), prominent, inline, micro, metadata.
 *   Data uses tabular-nums for alignment.
 *
 * EXAMPLES:
 * <Heading level="h1">Page Title</Heading>
 * <Heading level="h3" as="span">Inside CardTitle</Heading>  // avoids nested <h3>
 * <Text size="base" className="text-slate-600">Body copy</Text>
 * <Text as="span">Inside CardDescription</Text>              // avoids nested <p>
 * <Data size="metadata">4 items · 3 active</Data>
 *
 * DO NOT:
 * - Use manual text-xs, text-sm, text-lg etc. (use these components)
 * - Use Data for non-numeric text (use Text)
 * - Omit tabular-nums on numbers (Data includes it)
 */

import { cn } from '@/lib/utils/cn'
import { headingStyles, bodyStyles, dataStyles } from './typography-system'

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4'
export type BodySize = 'large' | 'base' | 'small' | 'caption' | 'micro'
export type DataSize = 'hero' | 'prominent' | 'inline' | 'micro' | 'metadata'

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: HeadingLevel
  serif?: boolean
  as?: keyof React.JSX.IntrinsicElements
  children: React.ReactNode
}

export function Heading({
  level,
  serif = false,
  as,
  className,
  children,
  ...props
}: HeadingProps) {
  const Component = (as || level) as 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'div'
  const levelStyles = headingStyles[level]
  const styles =
    serif && 'serif' in levelStyles ? levelStyles.serif : levelStyles.base

  return (
    <Component className={cn(styles, className)} {...props}>
      {children}
    </Component>
  )
}

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: BodySize
  as?: keyof React.JSX.IntrinsicElements
  children: React.ReactNode
}

export function Text({
  size = 'base',
  as = 'p',
  className,
  children,
  ...props
}: TextProps) {
  const Component = as as 'p' | 'span' | 'div'
  return (
    <Component className={cn(bodyStyles[size], className)} {...props}>
      {children}
    </Component>
  )
}

interface DataProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: DataSize
  children: React.ReactNode
}

export function Data({
  size = 'inline',
  className,
  children,
  ...props
}: DataProps) {
  return (
    <span className={cn(dataStyles[size], className)} {...props}>
      {children}
    </span>
  )
}

export { headingStyles, bodyStyles, dataStyles }
