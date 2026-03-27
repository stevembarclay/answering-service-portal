'use client'

import { useState, useActionState } from 'react'
import { saveBrandingAction, type BrandingFormState } from '@/app/(operator)/operator/settings/actions'

interface SettingsBrandingFormProps {
  initialName: string
  initialColor: string
  initialLogoUrl: string
  initialSupportEmail: string
  initialCustomDomain: string
}

export function SettingsBrandingForm({
  initialName,
  initialColor,
  initialLogoUrl,
  initialSupportEmail,
  initialCustomDomain,
}: SettingsBrandingFormProps) {
  const [state, action, isPending] = useActionState<BrandingFormState, FormData>(
    saveBrandingAction,
    null
  )

  const [color, setColor] = useState(initialColor)

  function handleColorPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setColor(e.target.value)
  }

  function handleColorTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setColor(val)
  }

  return (
    <form action={action} className="space-y-0 divide-y divide-border">
      {/* Portal name */}
      <div className="flex h-14 items-center justify-between px-5">
        <label htmlFor="brand-name" className="text-[13px] text-muted-foreground">
          Portal name
        </label>
        <input
          id="brand-name"
          name="name"
          type="text"
          defaultValue={initialName}
          placeholder="e.g. MedAnswering"
          className="h-9 w-56 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Brand color */}
      <div className="flex h-14 items-center justify-between px-5">
        <label htmlFor="brand-color-text" className="text-[13px] text-muted-foreground">
          Brand color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={handleColorPickerChange}
            aria-label="Pick brand color"
            className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
          />
          <input
            id="brand-color-text"
            name="color"
            type="text"
            value={color}
            onChange={handleColorTextChange}
            placeholder="#334155"
            maxLength={9}
            className="h-9 w-28 rounded-lg border border-border bg-muted px-3 text-[13px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Logo URL */}
      <div className="flex h-14 items-center justify-between px-5">
        <label htmlFor="brand-logo" className="text-[13px] text-muted-foreground">
          Logo URL
          <span className="ml-1.5 text-[12px]">(optional)</span>
        </label>
        <input
          id="brand-logo"
          name="logoUrl"
          type="url"
          defaultValue={initialLogoUrl}
          placeholder="https://your-cdn.com/logo.png"
          className="h-9 w-56 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Support email */}
      <div className="flex h-14 items-center justify-between px-5">
        <label htmlFor="brand-support-email" className="text-[13px] text-muted-foreground">
          Support email
        </label>
        <input
          id="brand-support-email"
          name="supportEmail"
          type="email"
          defaultValue={initialSupportEmail}
          placeholder="support@example.com"
          className="h-9 w-56 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Custom domain */}
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <label htmlFor="brand-custom-domain" className="text-[13px] text-muted-foreground">
            Client portal domain
          </label>
          <input
            id="brand-custom-domain"
            name="customDomain"
            type="text"
            defaultValue={initialCustomDomain}
            placeholder="portal.yourdomain.com"
            className="h-9 w-44 sm:w-56 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        {initialCustomDomain ? (
          <p className="text-right text-[12px] text-emerald-600">
            ✓ Active — clients can access via this domain
          </p>
        ) : (
          <p className="text-right text-[12px] text-muted-foreground">
            Point a CNAME from this domain to{' '}
            <span className="font-mono">cname.vercel-dns.com</span> after saving.
            DNS propagation takes up to 24 hours.
          </p>
        )}
      </div>

      {/* Footer row: feedback + save button */}
      <div className="flex h-[52px] items-center justify-between px-5">
        <div>
          {state?.success && (
            <p className="text-[13px] text-emerald-600">Branding saved.</p>
          )}
          {state?.error && (
            <p className="text-[13px] text-rose-600">{state.error}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-9 items-center rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save branding'}
        </button>
      </div>
    </form>
  )
}
