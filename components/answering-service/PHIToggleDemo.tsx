'use client'
import { Lock, LockOpen as Unlock } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
interface PHIToggleDemoProps {
  value: boolean
  onChange: (value: boolean) => void
  label?: string
}
/**
 * PHI Toggle Demo Component
 * 
 * Non-functional UI component for demonstrating HIPAA compliance features.
 * Toggles between showing and hiding Protected Health Information (PHI).
 */
export function PHIToggleDemo({ value, onChange, label = 'Show PHI' }: PHIToggleDemoProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(!value)}
        className={cn(
          'flex items-center gap-2',
          value ? 'border-slate-400 text-slate-700' : 'border-slate-300 text-muted-foreground'
        )}
      >
        {value ? (
          <>
            <Unlock className="w-4 h-4" />
            <span>{label}</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>Hide PHI</span>
          </>
        )}
      </Button>
      {!value && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" />
          PHI Hidden
        </span>
      )}
    </div>
  )
}
/**
 * Mask sensitive data when PHI is hidden
 */
export function maskPHI(text: string, isHidden: boolean): string {
  if (!isHidden) return text
  return '***REDACTED***'
}
/**
 * Mask phone number when PHI is hidden
 */
export function maskPhoneNumber(phone: string, isHidden: boolean): string {
  if (!isHidden) return phone
  return '***-***-****'
}
