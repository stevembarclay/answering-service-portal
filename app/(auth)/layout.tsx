import { Suspense, type ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>
    </div>
  )
}
