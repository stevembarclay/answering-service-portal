'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatCircle as MessageCircle } from '@phosphor-icons/react'
import { CoachChat } from './CoachChat'
interface CoachPanelProps {
  currentStep: number
  stepName: string
  industry: string | null
  businessName: string | null
  formData: Record<string, unknown>
}
export function CoachPanel({ currentStep, stepName, industry, businessName, formData }: CoachPanelProps) {
  return (
    <div className="w-80 flex-shrink-0">
      <Card className="sticky top-6 h-[calc(100vh-3rem)] flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Setup Assistant</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ask me anything about your setup
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          <CoachChat
            currentStep={currentStep}
            stepName={stepName}
            industry={industry || ''}
            businessName={businessName || ''}
            formData={formData}
          />
        </CardContent>
      </Card>
    </div>
  )
}
