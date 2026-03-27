'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaperPlaneTilt as Send } from '@phosphor-icons/react'
import { logger } from '@/lib/utils/logger'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
type Message = {
  role: 'user' | 'assistant'
  content: string
}
interface CoachChatProps {
  currentStep: number
  stepName: string
  industry: string
  businessName: string
  formData: Record<string, unknown>
}
export function CoachChat({ currentStep, stepName, industry, businessName, formData }: CoachChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm here to help you set up your Answering Service account. You're on the ${stepName} step. What questions do you have?`
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousStepRef = useRef<number>(currentStep)
  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])
  // Update greeting when step changes (but avoid duplicate messages on initial render)
  useEffect(() => {
    const previousStep = previousStepRef.current
    // Only add message if step actually changed (not on initial render)
    if (previousStep !== currentStep) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `You've moved to ${stepName}. Let me know if you need help with anything here.`
        }
      ])
    }
    // Always update ref for next render
    previousStepRef.current = currentStep
  }, [currentStep, stepName])
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return
    const userMessage = input.trim()
    setInput('')
    // Optimistically update UI
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(updatedMessages)
    setIsLoading(true)
    try {
      const response = await fetch('/api/answering-service/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages, // Use messages before user message (API adds it)
          wizardContext: {
            currentStep,
            stepName,
            industry: industry || '',
            businessName: businessName || '',
            formData,
          },
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }))
        throw new Error(errorData.error || 'Failed to get response')
      }
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (error: unknown) {
      logger.error('[CoachChat] Error sending message:', error)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' }
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, currentStep, stepName, industry, businessName, formData])
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  return (
    <div className="flex flex-col h-full min-h-0">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 pr-2"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <LoadingSpinner />
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="text-xs h-8"
          />
          <Button 
            variant="default"
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="h-8 w-8"
          >
            <Send className="h-3 w-3" />
          </Button>
        </form>
      </div>
    </div>
  )
}
