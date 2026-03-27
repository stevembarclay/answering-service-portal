'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChatCircle as MessageCircle, X } from '@phosphor-icons/react'
const CANNED_RESPONSES: Record<string, string> = {
  'patch': 'Patching transfers the call directly to you. When a call comes in, our agent will ask if you\'re available, then connect you live with the caller. If you don\'t answer, we\'ll take a message instead.',
  'screen': 'Screen and Patch means our agent first asks the caller their name and reason for calling, then checks with you before connecting. This lets you decide whether to take the call or have us take a message.',
  'message': 'When we take a message, our agent captures the caller\'s name, number, and reason for calling, then delivers it to you via your preferred channels (email, SMS, or portal).',
  'hours': 'You can set standard business hours (Mon-Fri 9-5), custom hours for each day, or 24/7 coverage. After-hours calls follow your after-hours rules.',
  'emergency': 'Emergency escalation lets you define criteria for urgent calls that should reach you immediately, even after hours. You\'ll specify what qualifies as an emergency and provide an emergency contact number.',
  'billing': 'Your plan includes a set number of minutes per month. If you exceed your allocation, overage minutes are billed at your plan\'s overage rate. You can view your usage anytime in the portal.',
  'hipaa': 'That\'s an important question that requires expert guidance. I\'m connecting you with our team now. A specialist will reach out within 15 minutes.',
  'legal': 'That\'s an important question that requires expert guidance. I\'m connecting you with our team now. A specialist will reach out within 15 minutes.',
  'default': 'I can help with questions about configuring your Answering Service account. Try asking about patching, screening, message delivery, business hours, or emergency escalation.'
}
export function AIChatStub() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: 'Hi! I\'m here to help with your setup. What questions do you have?' }
  ])
  const [input, setInput] = useState('')
  const handleSend = () => {
    if (!input.trim()) return
    const userMessage = input.toLowerCase()
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    // Simple keyword matching for canned responses
    let response = CANNED_RESPONSES.default
    if (userMessage.includes('patch') && !userMessage.includes('screen')) {
      response = CANNED_RESPONSES.patch
    } else if (userMessage.includes('screen')) {
      response = CANNED_RESPONSES.screen
    } else if (userMessage.includes('message')) {
      response = CANNED_RESPONSES.message
    } else if (userMessage.includes('hour')) {
      response = CANNED_RESPONSES.hours
    } else if (userMessage.includes('emergency') || userMessage.includes('escalat')) {
      response = CANNED_RESPONSES.emergency
    } else if (userMessage.includes('bill') || userMessage.includes('cost') || userMessage.includes('price')) {
      response = CANNED_RESPONSES.billing
    } else if (userMessage.includes('hipaa') || userMessage.includes('patient') || userMessage.includes('medical')) {
      response = CANNED_RESPONSES.hipaa
    } else if (userMessage.includes('legal') || userMessage.includes('attorney') || userMessage.includes('lawyer')) {
      response = CANNED_RESPONSES.legal
    }
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    }, 500)
  }
  if (!isOpen) {
    return (
      <Button
        variant="default"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }
  return (
    <Card className="fixed bottom-6 right-6 w-96 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base">AI Setup Assistant</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg text-sm ${
                msg.role === 'assistant'
                  ? 'bg-muted'
                  : 'bg-primary text-primary-foreground ml-8'
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
          />
          <Button variant="default" onClick={handleSend}>Send</Button>
        </div>
      </CardContent>
    </Card>
  )
}
