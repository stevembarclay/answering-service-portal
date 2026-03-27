'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatCircle as MessageCircle, ArrowsIn as Minimize2, ArrowsOut as Maximize2, X } from '@phosphor-icons/react'
import { DashboardCoachChat } from './DashboardCoachChat'
interface DashboardHelperProps {
  businessId: string
  businessName: string
}
export function DashboardHelper({ businessId, businessName }: DashboardHelperProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  if (!isOpen) {
    // Floating button to reopen
    return (
      <Button
        variant="default"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-72 shadow-lg">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Account Helper</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(false)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 h-[500px] shadow-lg flex flex-col">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b flex-shrink-0">
          <div>
            <CardTitle className="text-sm font-medium">Account Helper</CardTitle>
            <p className="text-xs text-muted-foreground">Ask about your account or services</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(true)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <DashboardCoachChat businessName={businessName} />
        </CardContent>
      </Card>
    </div>
  )
}
