'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PencilSimple as Edit } from '@phosphor-icons/react'
import type { CallTypes } from '@/schemas/answeringServiceSchema'
interface CallTypeCardProps {
  callType: CallTypes[0]
  onEdit: () => void
}
function getActionLabel(action: string | undefined): string {
  switch (action) {
    case 'take_message':
      return 'Take Message'
    case 'patch':
      return 'Patch'
    case 'screen_and_patch':
      return 'Screen & Patch'
    case 'custom':
      return 'Custom'
    default:
      return 'Not configured'
  }
}
function getTimeConditionSummary(timeConditions: CallTypeCardProps['callType']['timeConditions']): string[] {
  const summaries: string[] = []
  if (timeConditions.always) {
    summaries.push(`24/7: ${getActionLabel(timeConditions.always.action)}`)
  } else {
    if (timeConditions.businessHours) {
      summaries.push(`Business Hrs: ${getActionLabel(timeConditions.businessHours.action)}`)
    }
    if (timeConditions.afterHours) {
      summaries.push(`After Hrs: ${getActionLabel(timeConditions.afterHours.action)}`)
    }
  }
  return summaries.length > 0 ? summaries : ['Not configured']
}
export function CallTypeCard({ callType, onEdit }: CallTypeCardProps) {
  const summaries = getTimeConditionSummary(callType.timeConditions)
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold">{callType.name}</h3>
            <div className="space-y-1">
              {summaries.map((summary, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  {summary}
                </p>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="ml-4"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
