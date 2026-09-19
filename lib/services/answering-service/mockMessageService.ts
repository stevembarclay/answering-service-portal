import type { CallLog } from '@/types/answeringService'

export async function getCallLogs(_businessId: string): Promise<CallLog[]> {
  return []
}

export async function getCallTranscript(_callId: string): Promise<null> {
  return null
}
