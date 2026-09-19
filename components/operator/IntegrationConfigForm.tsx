'use client'

import { useActionState, useState } from 'react'

import {
  saveIntegrationConfigAction,
  testConnectionAction,
  type IntegrationConfigState,
  type TestConnectionState,
} from '@/app/(operator)/operator/settings/integrationActions'

type IntegrationPlatform = 'startel' | 'amtelco' | 'none'

interface IntegrationConfigFormProps {
  initialPlatform: IntegrationPlatform
  initialStarTelBaseUrl: string
  initialAmtelcoBaseUrl: string
  initialAmtelcoUsername: string
  initialFreshnessHours: number
  initialStarTelApiKeyMasked: string | null
  initialAmtelcoPasswordMasked: string | null
}

export function IntegrationConfigForm(props: IntegrationConfigFormProps) {
  const [saveState, saveAction, isSaving] = useActionState<IntegrationConfigState, FormData>(
    saveIntegrationConfigAction,
    null
  )
  const [testState, testAction, isTesting] = useActionState<TestConnectionState, FormData>(
    testConnectionAction,
    null
  )

  const [platform, setPlatform] = useState<IntegrationPlatform>(props.initialPlatform)
  const [freshnessHours, setFreshnessHours] = useState(String(props.initialFreshnessHours))

  return (
    <form action={saveAction} className="space-y-0 divide-y divide-border">
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">Platform</span>
          <div className="flex flex-wrap gap-2">
            <PlatformOption label="API + Zapier only" value="none" current={platform} onChange={setPlatform} />
            <PlatformOption label="StarTel" value="startel" current={platform} onChange={setPlatform} />
            <PlatformOption label="Amtelco" value="amtelco" current={platform} onChange={setPlatform} />
          </div>
        </div>
        <input type="hidden" name="platform" value={platform} />
      </div>

      {platform === 'startel' && (
        <>
          <FieldRow
            label="Base URL"
            input={(
              <input
                name="base_url"
                type="url"
                defaultValue={props.initialStarTelBaseUrl}
                placeholder="https://api.startel.com"
                className="h-9 w-64 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
          />
          <FieldRow
            label="API key"
            input={(
              <div className="flex flex-col items-end gap-1">
                <input
                  name="api_key"
                  type="password"
                  placeholder="Leave blank to keep current key"
                  className="h-9 w-64 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {props.initialStarTelApiKeyMasked ? (
                  <p className="text-[12px] text-muted-foreground">Current key: {props.initialStarTelApiKeyMasked}</p>
                ) : null}
              </div>
            )}
          />
        </>
      )}

      {platform === 'amtelco' && (
        <>
          <FieldRow
            label="Base URL"
            input={(
              <input
                name="base_url"
                type="url"
                defaultValue={props.initialAmtelcoBaseUrl}
                placeholder="https://mis.example.com"
                className="h-9 w-64 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
          />
          <FieldRow
            label="Username"
            input={(
              <input
                name="username"
                type="text"
                defaultValue={props.initialAmtelcoUsername}
                placeholder="Amtelco username"
                className="h-9 w-64 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
          />
          <FieldRow
            label="Password"
            input={(
              <div className="flex flex-col items-end gap-1">
                <input
                  name="password"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  className="h-9 w-64 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {props.initialAmtelcoPasswordMasked ? (
                  <p className="text-[12px] text-muted-foreground">Current password: {props.initialAmtelcoPasswordMasked}</p>
                ) : null}
              </div>
            )}
          />
        </>
      )}

      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="freshness-hours" className="text-[13px] text-muted-foreground">
            Data freshness alert window
          </label>
          <div className="flex items-center gap-2">
            <input
              id="freshness-hours"
              name="data_freshness_alert_hours"
              type="number"
              min={0}
              value={freshnessHours}
              onChange={(event) => setFreshnessHours(event.target.value)}
              className="h-9 w-20 rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-[13px] text-muted-foreground">hours</span>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Set to <span className="font-mono">0</span> to disable email alerts when call data stops arriving.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="space-y-1">
          {saveState?.success ? <p className="text-[13px] text-emerald-600">Integration settings saved.</p> : null}
          {saveState?.error ? <p className="text-[13px] text-rose-600">{saveState.error}</p> : null}
          {testState?.message ? (
            <p className={`text-[13px] ${testState.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
              {testState.ok ? '✓' : '✗'} {testState.message}
              {typeof testState.latencyMs === 'number' ? ` (${testState.latencyMs} ms)` : ''}
            </p>
          ) : null}
          {platform === 'none' ? (
            <p className="text-[12px] text-muted-foreground">
              API-only mode uses the existing <span className="font-mono">POST /api/v1/calls</span> endpoint.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            formAction={testAction}
            disabled={isTesting}
            className="flex h-9 items-center rounded-lg border border-border bg-background px-4 text-[13px] font-medium text-foreground transition-opacity disabled:opacity-60"
          >
            {isTesting ? 'Testing…' : 'Test Connection'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-9 items-center rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}

function PlatformOption(props: {
  label: string
  value: IntegrationPlatform
  current: IntegrationPlatform
  onChange: (value: IntegrationPlatform) => void
}) {
  const active = props.current === props.value

  return (
    <button
      type="button"
      onClick={() => props.onChange(props.value)}
      className={`rounded-lg border px-3 py-2 text-[13px] transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground'
      }`}
    >
      {props.label}
    </button>
  )
}

function FieldRow(props: { label: string; input: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-[13px] text-muted-foreground">{props.label}</span>
      {props.input}
    </div>
  )
}
