import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { IntegrationGuide } from '@/components/operator/IntegrationGuide'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { checkOperatorAccessOrThrow } from '@/lib/auth/server'

export default async function IntegrationsPage() {
  await checkOperatorAccessOrThrow()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border bg-card px-4 md:px-8">
        <div className="flex items-center gap-1.5">
          <Link
            href="/operator/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Settings
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Integrations</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Configure call sources and connect external systems.
            </p>
          </div>

          <Tabs defaultValue="guide">
            <TabsList>
              <TabsTrigger value="guide">Guide</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="guide" className="pt-4">
              <IntegrationGuide />
            </TabsContent>

            <TabsContent value="configuration" className="pt-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold text-foreground">Integration source settings</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Credentials and freshness settings live in Operator Settings so there is a single
                  source of truth.
                </p>
                <Link
                  href="/operator/settings#integration-source"
                  className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Open integration settings
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
