'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListChecks, LayoutDashboard } from 'lucide-react'

const DEMO_WELCOME_KEY = 'demo_welcome_seen'

export default function DemoWelcomePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(DEMO_WELCOME_KEY)) {
      router.replace('/answering-service/dashboard')
    } else {
      setReady(true)
    }
  }, [router])

  function handleWizard() {
    sessionStorage.setItem(DEMO_WELCOME_KEY, '1')
    router.push('/answering-service/setup')
  }

  function handleDashboard() {
    sessionStorage.setItem(DEMO_WELCOME_KEY, '1')
    router.push('/answering-service/dashboard')
  }

  if (!ready) return null

  return (
    <div className="flex h-full items-center justify-center bg-[#f8fafc] px-8">
      <div className="flex w-full max-w-[800px] flex-col items-center gap-6">
        {/* Badge */}
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-muted-foreground">Demo Account</span>
        </div>

        {/* Headline */}
        <div className="flex flex-col items-center gap-2.5 text-center">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">
            Where would you like to start?
          </h1>
          <p className="max-w-[580px] text-[15px] leading-relaxed text-muted-foreground">
            You&apos;re exploring the Answer First demo. Walk through how a new client gets set
            up, or jump straight into the live dashboard.
          </p>
        </div>

        {/* Cards */}
        <div className="grid w-full grid-cols-2 gap-5">
          {/* Wizard card */}
          <div className="flex flex-col gap-5 rounded-xl border border-border bg-white p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-slate-950">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-[17px] font-semibold text-foreground">
                Walk through client onboarding
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                See exactly how a new business gets configured — from business hours to on-call
                schedules. Takes about 5 minutes.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {[
                'Configure business hours & call routing',
                'Set up on-call contacts & escalations',
                'Choose message delivery preferences',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[13px] text-slate-600">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <button
                onClick={handleWizard}
                className="flex h-[42px] w-full items-center justify-center rounded-lg bg-slate-950 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Start the onboarding wizard →
              </button>
            </div>
          </div>

          {/* Dashboard card */}
          <div className="flex flex-col gap-5 rounded-xl border border-border bg-white p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-slate-100">
              <LayoutDashboard className="h-5 w-5 text-slate-500" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-[17px] font-semibold text-foreground">
                Explore the live dashboard
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Jump into a fully-loaded demo with 30 days of call history, messages, billing
                data, and on-call schedules already in place.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {[
                '30 days of sample call & message history',
                'Invoice PDFs and billing summaries',
                'On-call schedule and contact management',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[13px] text-slate-600">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <button
                onClick={handleDashboard}
                className="flex h-[42px] w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[14px] font-semibold text-foreground transition-opacity hover:opacity-80"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
