import type { DashboardSummary } from '@/types/answeringService'

export async function getDashboardSummary(_businessId: string): Promise<DashboardSummary> {
  return {
    callsThisWeek: 0,
    callsLastWeek: 0,
    callsByDay: [],
    unreadCount: 0,
    currentMonthEstimate: 0,
    currentMonthCallCount: 0,
    daysRemainingInPeriod: 0,
    topUnreadMessages: [],
    callsByHour: [],
    callTypeBreakdown: [],
  }
}
