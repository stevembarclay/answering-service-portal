import Link from 'next/link'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const CALL_TYPES = ['urgent', 'new-client', 'appointment', 'general-info', 'after-hours']

const UNIVERSAL_WEBHOOK_BODY = `[
  {
    "businessId": "[your-client-business-id]",
    "timestamp": "2026-03-26T14:30:00Z",
    "callerName": "Jane Caller",
    "callerNumber": "+15551234567",
    "callbackNumber": "+15557654321",
    "callType": "general-info",
    "direction": "inbound",
    "durationSeconds": 180,
    "telephonyStatus": "completed",
    "message": "Patient requested a callback."
  }
]`

const CSV_HEADER =
  'timestamp,business_id,caller_name,caller_number,callback_number,call_type,direction,duration_seconds,telephony_status,message'

export function IntegrationGuide() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">Connect Your Call Center Platform</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use Zapier, a native polling adapter, or a direct webhook push to send calls into the portal.
        </p>
      </div>

      <Tabs defaultValue="startel">
        <TabsList>
          <TabsTrigger value="startel">StarTel</TabsTrigger>
          <TabsTrigger value="amtelco">Amtelco</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="startel" className="space-y-6 pt-4">
          <GuideSteps
            title="StarTel via Zapier"
            description="StarTel has a native Zapier integration. Trigger on a new call, then POST a JSON payload to your portal."
            triggerLabel="StarTel → New Call"
          />
        </TabsContent>

        <TabsContent value="amtelco" className="space-y-6 pt-4">
          <GuideSteps
            title="Amtelco via Webhooks by Zapier"
            description="Amtelco MIS can trigger a Zapier webhook from new message activity. Map the MIS fields into the universal call payload."
            triggerLabel="Amtelco MIS → New Message"
          />
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex h-[52px] items-center border-b border-border px-5">
              <span className="text-sm font-semibold text-foreground">Amtelco field mapping</span>
            </div>
            <div className="p-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amtelco field</TableHead>
                    <TableHead>Portal field</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <MappingRow source="CallDateTime" target="timestamp" />
                  <MappingRow source="CallerID" target="callerNumber" />
                  <MappingRow source="CallerName" target="callerName" />
                  <MappingRow source="CallbackNumber" target="callbackNumber" />
                  <MappingRow source="Duration" target="durationSeconds" />
                  <MappingRow source="MessageType" target="callType" />
                  <MappingRow source="Direction" target="direction" />
                  <MappingRow source="Disposition" target="telephonyStatus" />
                  <MappingRow source="MessageText" target="message" />
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="other" className="space-y-6 pt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex h-[52px] items-center border-b border-border px-5">
              <span className="text-sm font-semibold text-foreground">Universal webhook format</span>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                If your platform supports webhooks or Zapier, send a JSON array to
                <span className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">POST /api/v1/calls</span>
                with an operator API key that has <span className="font-mono text-foreground">calls:write</span>.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-[12px] leading-relaxed whitespace-pre text-foreground">
                {UNIVERSAL_WEBHOOK_BODY}
              </pre>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <UniversalFieldRow field="businessId" required="Yes" description="Business UUID from the client record URL." />
                  <UniversalFieldRow field="timestamp" required="Yes" description="ISO 8601 timestamp for when the call occurred." />
                  <UniversalFieldRow field="callerName" required="No" description="Caller display name if available." />
                  <UniversalFieldRow field="callerNumber" required="No" description="Inbound caller number." />
                  <UniversalFieldRow field="callbackNumber" required="No" description="Best callback number for follow-up." />
                  <UniversalFieldRow field="callType" required="Yes" description="One of the supported call type slugs shown below." />
                  <UniversalFieldRow field="direction" required="Yes" description="Use inbound or outbound." />
                  <UniversalFieldRow field="durationSeconds" required="Yes" description="Call duration in seconds." />
                  <UniversalFieldRow field="telephonyStatus" required="Yes" description="Use completed, missed, or voicemail." />
                  <UniversalFieldRow field="message" required="Yes" description="The operator-facing message body or note." />
                  <UniversalFieldRow field="recordingUrl" required="No" description="Public recording URL or storage path." />
                </TableBody>
              </Table>
              <p className="text-[12px] text-amber-700">
                callType must be one of {CALL_TYPES.map((type) => `"${type}"`).join(', ')}.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">CSV fallback</span>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            If you prefer batch upload over Zapier, export call logs as CSV and upload them from{' '}
            <Link href="/operator/usage" className="text-primary underline-offset-2 hover:underline">
              Usage
            </Link>.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-[12px] whitespace-pre text-foreground">
            {CSV_HEADER}
          </pre>
        </div>
      </div>
    </div>
  )
}

function GuideSteps(props: { title: string; description: string; triggerLabel: string }) {
  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">{props.title}</span>
        </div>
        <div className="p-5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">{props.description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Step 1 — Create an API key</span>
        </div>
        <ol className="space-y-0 divide-y divide-border">
          <StepRow n={1}>Open <Link href="/operator/api-webhooks" className="text-primary underline-offset-2 hover:underline">API &amp; Webhooks</Link>.</StepRow>
          <StepRow n={2}>Create a key labeled <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">Integration</code> with <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">calls:write</code>.</StepRow>
          <StepRow n={3}>Copy the token now. It will not be shown again.</StepRow>
        </ol>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Step 2 — Configure the webhook</span>
        </div>
        <div className="space-y-3 p-5 text-[13px]">
          <GuideRow label="Trigger">{props.triggerLabel}</GuideRow>
          <GuideRow label="Action">Webhooks by Zapier → POST</GuideRow>
          <GuideRow label="URL">https://[your-domain]/api/v1/calls</GuideRow>
          <GuideRow label="Headers">Authorization: Bearer [your-api-key]</GuideRow>
          <GuideRow label="Body">Use the universal JSON payload shown in the Other tab.</GuideRow>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Step 3 — Find your business ID</span>
        </div>
        <div className="p-5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Your business ID appears in the client URL:
            <span className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">/operator/clients/[business-id]</span>
            Copy that value into the payload&apos;s <span className="font-mono text-foreground">businessId</span> field.
          </p>
        </div>
      </div>
    </>
  )
}

function StepRow(props: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex list-none items-start gap-3 px-5 py-3.5 text-[13px] text-foreground">
      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
        {props.n}
      </span>
      <span className="leading-relaxed">{props.children}</span>
    </li>
  )
}

function GuideRow(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-muted-foreground">{props.label}</span>
      <div className="flex-1 text-foreground">{props.children}</div>
    </div>
  )
}

function MappingRow(props: { source: string; target: string }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-[12px]">{props.source}</TableCell>
      <TableCell className="font-mono text-[12px]">{props.target}</TableCell>
    </TableRow>
  )
}

function UniversalFieldRow(props: { field: string; required: string; description: string }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-[12px]">{props.field}</TableCell>
      <TableCell>{props.required}</TableCell>
      <TableCell className="whitespace-normal text-muted-foreground">{props.description}</TableCell>
    </TableRow>
  )
}
