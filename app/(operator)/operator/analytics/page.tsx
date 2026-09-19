import { checkOperatorAccessOrThrow } from '@/lib/auth/server'

export default async function AnalyticsPage() {
  await checkOperatorAccessOrThrow()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border bg-card px-4 md:px-8">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-lg pt-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-foreground">Analytics &amp; Reporting</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Call volume trends, busiest hours, engagement heatmaps, churn risk indicators, and
            scheduled reports are available in the managed platform.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Contact{' '}
            <a
              href="mailto:hello@stintwell.com"
              className="font-medium text-primary hover:underline"
            >
              hello@stintwell.com
            </a>{' '}
            to learn more about managed deployment.
          </p>
        </div>
      </div>
    </div>
  )
}
