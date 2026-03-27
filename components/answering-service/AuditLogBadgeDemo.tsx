'use client'
import { Badge } from '@/components/ui/badge'
import { Clock } from '@phosphor-icons/react'
import { format } from 'date-fns'
interface AuditLogBadgeDemoProps {
  timestamp?: string
  action?: string
}
/**
 * Audit Log Badge Demo Component
 * 
 * Non-functional UI component for demonstrating HIPAA audit logging features.
 * Displays visual indicator that an action has been logged.
 */
export function AuditLogBadgeDemo({ timestamp, action }: AuditLogBadgeDemoProps) {
  return (
    <Badge variant="outline" className="text-xs flex items-center gap-1">
      <Clock className="w-3 h-3" />
      <span>Audit Logged</span>
      {timestamp && (
        <span className="ml-1 text-muted-foreground">
          {format(new Date(timestamp), 'MMM d, h:mm a')}
        </span>
      )}
      {action && (
        <span className="ml-1 text-muted-foreground">
          • {action}
        </span>
      )}
    </Badge>
  )
}
