'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaperPlaneTilt as Send } from '@phosphor-icons/react'
import { logger } from '@/lib/utils/logger'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
type Message = {
  role: 'user' | 'assistant'
  content: string
}
interface DashboardCoachChatProps {
  businessName: string
}
export function DashboardCoachChat({ businessName }: DashboardCoachChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your Answering Service account helper. I can answer questions about your account, our services, billing, or help you submit feedback. How can I help?`
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)
    try {
      const response = await fetch('/api/answering-service/dashboard-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          context: { businessName, mode: 'account_support' },
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }))
        throw new Error(errorData.error || 'Failed to get response')
      }
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (error: unknown) {
      logger.error('[DashboardCoachChat] Error sending message:', error)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' }
      ])
    } finally {
      setIsLoading(false)
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  return (
    <div className="flex flex-col h-full">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
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
      <div className="p-4 border-t">
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
          />
          <Button variant="default" type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
