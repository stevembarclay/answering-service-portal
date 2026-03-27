'use client'

import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'
import type { OperatorSetupStatus } from '@/lib/services/operator/operatorService'

interface SetupStep {
  number: number
  title: string
  description: string
  completed: boolean
  cta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export function OperatorSetupWizard({ status }: { status: OperatorSetupStatus }) {
  const steps: SetupStep[] = [
    {
      number: 1,
      title: 'Brand your portal',
      description: 'Add your logo and primary color so clients see your company, not a generic portal.',
      completed: status.hasBranding,
      cta: { label: 'Configure Branding', href: '/operator/settings' },
    },
    {
      number: 2,
      title: 'Create a billing template',
      description: 'Define how you bill clients. Apply templates when adding clients to save time.',
      completed: status.hasTemplate,
      cta: { label: 'Create Template', href: '/operator/billing-templates' },
    },
    {
      number: 3,
      title: 'Add your clients',
      description: 'Import existing clients from CSV or add them one by one.',
      completed: status.hasClients,
      cta: { label: 'Import CSV', href: '/operator/clients/import' },
      secondaryCta: { label: 'Add One Client', href: '/operator/clients/new' },
    },
    {
      number: 4,
      title: 'Connect your call center',
      description: 'Integrate StarTel, Amtelco, or any system via Zapier or the REST API so call data flows in automatically.',
      completed: status.hasApiKeyOrWebhook,
      cta: { label: 'View Integration Guide', href: '/operator/integrations' },
      secondaryCta: { label: 'Manage API Keys', href: '/operator/api-webhooks' },
    },
    {
      number: 5,
      title: 'Send your first call',
      description: 'Verify the integration by sending a test call through the API. It will appear in the client&apos;s message inbox.',
      completed: status.hasCallData,
      cta: { label: 'Open API Docs', href: '/operator/api-webhooks' },
    },
  ]

  const completedCount = steps.filter((step) => step.completed).length

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{completedCount} of 5 steps complete</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Progress updates automatically as your live operator data changes.
            </p>
          </div>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(completedCount / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {status.isComplete ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <h2 className="text-lg font-semibold text-foreground">You&apos;re all set! Your portal is fully configured.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your branding, templates, clients, integration, and live call flow are all in place.
          </p>
          <Link
            href="/operator/clients"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Go to Clients
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.number} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                  step.completed
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-border bg-muted text-foreground'
                }`}
              >
                {step.completed ? <Check className="h-5 w-5" /> : step.number}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className={`text-base font-semibold ${step.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {step.title}
                  </h2>
                  {step.completed ? (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Complete
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={step.cta.href}
                    className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    {step.cta.label}
                  </Link>
                  {step.secondaryCta ? (
                    <Link
                      href={step.secondaryCta.href}
                      className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {step.secondaryCta.label}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
