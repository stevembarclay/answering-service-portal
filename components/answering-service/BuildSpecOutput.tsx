'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CallFlowDiagram } from './CallFlowDiagram'
import { sendMagicLinkSMS } from './actions/send-magic-link'
import { OnboardingBooking } from './OnboardingBooking'
import { DeviceMobile as Smartphone, CheckCircle as CheckCircle2, CheckCircle, Calendar } from '@phosphor-icons/react'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'
import { logger } from '@/lib/utils/logger'
interface BuildSpecOutputProps {
  data: AnsweringServiceSetup
  businessId: string
}
export function BuildSpecOutput({ data, businessId }: BuildSpecOutputProps) {
  const markdown = generateBuildSpec(data)
  const mermaidCode = generateMermaidDiagram(data)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const router = useRouter()
  // Extract phone number - support both schema structures
  // SAFETY: messageDelivery may arrive in either nested (globalDefaults.smsNumber) or flat (smsNumber) shape
  const messageDelivery = data.messageDelivery as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const phoneNumber = messageDelivery?.globalDefaults?.smsNumber ||
                      messageDelivery?.smsNumber ||
                      null
  const handleSendMagicLink = async () => {
    if (!phoneNumber) return
    setMagicLinkLoading(true)
    setMagicLinkError(null)
    try {
      const result = await sendMagicLinkSMS(phoneNumber, businessId)
      if (result.success) {
        setMagicLinkSent(true)
      } else {
        setMagicLinkError(result.error || 'Failed to send magic link')
      }
    } catch (error: unknown) {
      logger.error('[BuildSpecOutput] Error sending magic link:', error)
      setMagicLinkError(error instanceof Error ? error.message : 'Failed to send magic link')
    } finally {
      setMagicLinkLoading(false)
    }
  }
  const handleGoToDashboard = () => {
    router.push('/answering-service/dashboard')
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>✓ Setup Information Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your configuration has been captured. An Answering Service specialist will review 
            your setup and configure your account. You'll receive confirmation when 
            your account is live (typically within 2-4 hours during business hours).
          </p>
        </CardContent>
      </Card>
      {phoneNumber && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle>📱 Get instant access on your phone</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We'll text you a magic link to access your dashboard instantly. Tap the link to sign in.
            </p>
            {magicLinkError && (
              <div className="p-3 border border-destructive rounded-lg bg-destructive/10">
                <p className="text-sm text-destructive">{magicLinkError}</p>
              </div>
            )}
            <Button
              variant="default"
              onClick={handleSendMagicLink}
              disabled={magicLinkSent || magicLinkLoading}
              className="w-full"
            >
              {magicLinkSent ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Sent ✓
                </>
              ) : magicLinkLoading ? (
                'Sending...'
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Send Magic Link
                </>
              )}
            </Button>
            {magicLinkSent && (
              <p className="text-xs text-muted-foreground text-center">
                Magic link sent! Check your phone for the SMS.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <Tabs defaultValue="spec">
        <TabsList>
          <TabsTrigger value="spec">Build Specification</TabsTrigger>
          <TabsTrigger value="diagram">Call Flow Diagram</TabsTrigger>
        </TabsList>
        <TabsContent value="spec">
          <Card>
            <CardHeader>
              <CardTitle>Build Specification</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                {markdown}
              </pre>
              <Button variant="outline" className="mt-4" onClick={() => copyToClipboard(markdown)}>
                Copy to Clipboard
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="diagram">
          <Card>
            <CardHeader>
              <CardTitle>Call Flow Diagram</CardTitle>
            </CardHeader>
            <CardContent>
              <CallFlowDiagram code={mermaidCode} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="mt-8 pt-8 border-t">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-8 w-8" />
            <h2 className="text-2xl font-semibold">Your Setup is Complete</h2>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your configuration has been submitted. An Answering Service team member 
            will review and build your account within 24-48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="default" onClick={() => setShowBooking(true)} size="lg">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule a Review Call
            </Button>
            <Button variant="outline" onClick={handleGoToDashboard} size="lg">
              I'm All Set — Go to Dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Have questions later? You can always schedule a call from your dashboard.
          </p>
        </div>
      </div>
      {showBooking && (
        <div className="mt-8">
          <OnboardingBooking businessId={businessId} />
        </div>
      )}
    </div>
  )
}
/**
 * Format action enum value to readable string
 */
function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    'take_message': 'Take Message',
    'patch': 'Patch Through',
    'screen_and_patch': 'Screen and Patch',
    'custom': 'Custom Script'
  }
  return actionMap[action] || action
}
/**
 * Format info to collect array to readable string
 */
function formatInfoToCollect(infoToCollect?: Array<{ field: string; required: boolean; customLabel?: string }>): string {
  if (!infoToCollect || infoToCollect.length === 0) {
    return 'Name, Phone Number'
  }
  return infoToCollect.map(info => info.customLabel || info.field).join(', ')
}
/**
 * Format call type handling configuration for a time condition
 */
function formatTimeCondition(config: { action: string; patchTo?: string; screeningQuestions?: string[]; infoToCollect?: Array<{ field: string; required: boolean; customLabel?: string }> }): string {
  let output = `Action: ${formatAction(config.action)}`
  if (config.patchTo) {
    output += `\nPatch To: ${config.patchTo}`
  }
  if (config.screeningQuestions && config.screeningQuestions.length > 0) {
    output += `\nScreening Questions:`
    config.screeningQuestions.forEach((q, i) => {
      output += `\n  ${i + 1}. "${q}"`
    })
  }
  const collectInfo = formatInfoToCollect(config.infoToCollect)
  output += `\nCollect: ${collectInfo}`
  return output
}
function generateBuildSpec(data: AnsweringServiceSetup): string {
  // Extract profile data
  const profile = data.profile
  const businessName = profile.businessName || ''
  // Extract greeting data
  const greeting = data.greeting
  const greetingTemplate = greeting.template === 'custom' 
    ? greeting.customScript || '' 
    : greeting.template || ''
  const presentAs = greeting.presentAs === 'employee' 
    ? `Answer as an employee of ${businessName}`
    : `Answer as ${businessName}'s answering service`
  const languageMap: Record<string, string> = {
    english: 'Primarily English',
    bilingual: 'English & Spanish (Bilingual)',
    spanish: 'Primarily Spanish'
  }
  const language = languageMap[greeting.language] || 'English'
  // Extract business hours
  const businessHours = data.businessHours
  const hoursType = businessHours.type || 'standard'
  const timezone = businessHours.timezone || 'America/New_York'
  const customHours = businessHours.customHours || []
  // Extract message delivery
  const messageDelivery = data.messageDelivery
  const channels = messageDelivery.globalDefaults.channels || []
  const emailAddress = messageDelivery.globalDefaults.emailAddress || ''
  const smsNumber = messageDelivery.globalDefaults.smsNumber || ''
  const urgentSmsEnabled = messageDelivery.globalDefaults.urgentSmsEnabled || false
  const callTypeOverrides = messageDelivery.callTypeOverrides || {}
  // Extract escalation
  const escalation = data.escalation
  const escalationEnabled = escalation.enabled || false
  const globalEscalationContact = escalation.globalEscalationContact || ''
  const callTypeRules = escalation.callTypeRules || {}
  // Extract call types
  const callTypes = data.callTypes || []
  // Build spec content
  let spec = `# Answering Service Account Build Specification
Generated: ${new Date().toISOString()}
## Profile
- Business Name: ${businessName}
- Industry: ${profile.industry || 'Not specified'}
- Contact: ${profile.contactName || ''} (${profile.email || ''})
${profile.phone ? `- Phone: ${profile.phone}` : ''}
## Greeting Script
- Language Preference: ${language}
- Presentation Style: ${presentAs}
- Template: "${greetingTemplate}"
## Business Hours
- Type: ${hoursType}
- Timezone: ${timezone}`
  if (hoursType === 'custom' && customHours.length > 0) {
    spec += '\n- Custom Schedule:'
    customHours.forEach((day) => {
      if (day.closed) {
        spec += `\n  ${day.day}: Closed`
      } else {
        spec += `\n  ${day.day}: ${day.open} - ${day.close}`
      }
    })
  }
  spec += `\n\n## Call Types & Handling\n`
  if (callTypes.length === 0) {
    spec += `- No call types configured\n`
  } else {
    callTypes.forEach((callType) => {
      spec += `\n### Call Type: ${callType.name}\n`
      const timeConditions = callType.timeConditions
      // Handle 'always' time condition (24/7 types)
      if (timeConditions.always) {
        spec += `Always:\n`
        spec += formatTimeCondition(timeConditions.always).split('\n').map(line => `  ${line}`).join('\n')
        spec += '\n'
      } else {
        // Handle business hours
        if (timeConditions.businessHours) {
          spec += `During Business Hours:\n`
          spec += formatTimeCondition(timeConditions.businessHours).split('\n').map(line => `  ${line}`).join('\n')
          spec += '\n'
        }
        // Handle after hours
        if (timeConditions.afterHours) {
          spec += `After Hours:\n`
          spec += formatTimeCondition(timeConditions.afterHours).split('\n').map(line => `  ${line}`).join('\n')
          spec += '\n'
        }
      }
      // Show escalation rules if configured
      const escalationRule = callTypeRules[callType.id]
      if (escalationRule?.canEscalate) {
        spec += `Escalation:\n`
        spec += `  Enabled: Yes\n`
        if (escalationRule.criteria) {
          spec += `  Criteria: ${escalationRule.criteria}\n`
        }
        if (escalationRule.escalateTo) {
          spec += `  Escalate To: ${escalationRule.escalateTo}\n`
        } else if (globalEscalationContact) {
          spec += `  Escalate To: ${globalEscalationContact} (Global)\n`
        }
        if (escalationRule.timeCondition) {
          spec += `  Time Condition: ${escalationRule.timeCondition}\n`
        }
        spec += '\n'
      }
    })
  }
  spec += `\n## Message Delivery
- Global Default Channels: ${channels.length > 0 ? channels.join(', ') : 'None'}
${emailAddress ? `- Email: ${emailAddress}` : ''}
${smsNumber ? `- SMS: ${smsNumber}` : ''}
- Urgent SMS Enabled: ${urgentSmsEnabled ? 'Yes' : 'No'}`
  // Add call type overrides if any
  const overrideCallTypeIds = Object.keys(callTypeOverrides)
  if (overrideCallTypeIds.length > 0) {
    spec += `\n\n### Call Type Delivery Overrides:`
    overrideCallTypeIds.forEach((callTypeId) => {
      const callType = callTypes.find(ct => ct.id === callTypeId)
      const override = callTypeOverrides[callTypeId]
      if (callType && override) {
        spec += `\n- ${callType.name}:`
        if (override.channels) {
          spec += ` ${override.channels.join(', ')}`
        }
        if (override.urgentOverride !== undefined) {
          spec += ` (Urgent: ${override.urgentOverride ? 'Yes' : 'No'})`
        }
      }
    })
  }
  spec += `\n\n## Escalation Rules
- Global Escalation Enabled: ${escalationEnabled ? 'Yes' : 'No'}
${globalEscalationContact ? `- Global Escalation Contact: ${globalEscalationContact}` : ''}`
  // Add call type escalation rules summary
  const escalationCallTypeIds = Object.keys(callTypeRules).filter(id => callTypeRules[id]?.canEscalate)
  if (escalationCallTypeIds.length > 0) {
    spec += `\n- Call Types with Escalation Enabled:`
    escalationCallTypeIds.forEach((callTypeId) => {
      const callType = callTypes.find(ct => ct.id === callTypeId)
      if (callType) {
        spec += `\n  - ${callType.name}`
      }
    })
  }
  spec += `\n\n---
*This specification is for the Answering Service build team. Do not modify without customer confirmation.*`
  return spec
}
/**
 * Generate Mermaid diagram for call flow
 * Note: Temporarily simplified due to complex time-conditioned handling structure
 */
function generateMermaidDiagram(data: AnsweringServiceSetup): string {
  // Helper to escape special characters in Mermaid labels
  const escapeLabel = (label: string): string => {
    return label.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, ' ')
  }
  const callTypes = data.callTypes || []
  const businessHours = data.businessHours
  const hoursType = businessHours.type || 'standard'
  const messageDelivery = data.messageDelivery
  const deliveryChannels = messageDelivery.globalDefaults.channels.join(' + ') || 'Email'
  const escalation = data.escalation
  const globalEscalationContact = escalation.globalEscalationContact || ''
  const callTypeRules = escalation.callTypeRules || {}
  // Build a simplified flowchart showing the overall flow
  // For detailed per-call-type flows, see the build specification
  let diagram = `flowchart TD
    A["Incoming Call"] --> B{"Business Hours?<br/>${hoursType === '24_7' ? '24/7 Coverage' : hoursType === 'custom' ? 'Custom Hours' : 'Standard Hours'}"}
    B -->|During Hours| C["Answer with Greeting"]
    B -->|After Hours| D["After-Hours Handling"]
    C --> E{"Call Type?"}`
  // Add nodes for each call type during business hours
  if (callTypes.length === 0) {
    // No call types configured
    diagram += `\n    E --> DEFAULT["Take Message<br/>(Default)"]`
    diagram += `\n    DEFAULT --> DELIVER`
  } else {
    callTypes.forEach((callType, index) => {
      const callTypeLabel = escapeLabel(callType.name)
      const timeCondition = callType.timeConditions.businessHours || callType.timeConditions.always
      const action = timeCondition?.action ? formatAction(timeCondition.action) : 'Take Message'
      const nodeId = `CT${index}`
      diagram += `\n    E -->|${callTypeLabel}| ${nodeId}["${escapeLabel(action)}"]`
      // Check for escalation
      const escalationRule = callTypeRules[callType.id]
      if (escalationRule?.canEscalate) {
        const escalationNodeId = `ESC${index}`
        const escalateTo = escalationRule.escalateTo || globalEscalationContact || 'Global Contact'
        diagram += `\n    ${nodeId} --> ${escalationNodeId}["Escalate to<br/>${escapeLabel(escalateTo)}"]`
        diagram += `\n    ${escalationNodeId} --> DELIVER`
      } else {
        diagram += `\n    ${nodeId} --> DELIVER`
      }
    })
  }
  // Add after-hours handling - show first call type's after-hours action as example
  // (Detailed per-call-type after-hours flows are in the build spec)
  const hasAfterHoursConfig = callTypes.some(ct => ct.timeConditions.afterHours)
  if (hasAfterHoursConfig) {
    const firstAfterHours = callTypes.find(ct => ct.timeConditions.afterHours)
    if (firstAfterHours?.timeConditions.afterHours) {
      const ahAction = formatAction(firstAfterHours.timeConditions.afterHours.action)
      diagram += `\n    D --> AH["${escapeLabel(ahAction)}<br/>(After-Hours)"]`
      diagram += `\n    AH --> DELIVER`
    } else {
      diagram += `\n    D --> AH["Take Message<br/>(After-Hours)"]`
      diagram += `\n    AH --> DELIVER`
    }
  } else {
    diagram += `\n    D --> AH["Take Message<br/>(After-Hours Default)"]`
    diagram += `\n    AH --> DELIVER`
  }
  // Add delivery node
  diagram += `\n    DELIVER["Deliver via<br/>${escapeLabel(deliveryChannels)}"]
    style A fill:#e1f5ff
    style DELIVER fill:#d4edda
    style D fill:#fff3cd
    style AH fill:#fff3cd
  `
  return diagram
}
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}
