import { checkOperatorAccessOrThrow } from '@/lib/auth/server'

export default async function OperatorBillingPage() {
  await checkOperatorAccessOrThrow()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border bg-card px-4 md:px-8">
        <h1 className="text-xl font-bold text-foreground">Billing</h1>
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
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-foreground">Operator Billing Dashboard</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The cross-client revenue dashboard, MRR trends, billing CSV export, and PDF invoice
            generation are available in the managed platform.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Per-client billing rules and estimates are available in each client&apos;s detail page.
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
