// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'

/**
 * Custom error class for wizard service operations
 */
export class WizardServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: unknown
  ) {
    super(message)
    this.name = 'WizardServiceError'
  }
}

/**
 * Wizard session data type
 */
export interface WizardSession {
  id: string
  business_id: string
  user_id: string
  current_step: number
  wizard_data: Partial<AnsweringServiceSetup>
  path_selected: 'self_serve' | 'concierge' | null
  status: 'in_progress' | 'completed' | 'abandoned'
  build_status: 'pending_build' | 'in_review' | 'ready' | 'call_scheduled' | null
  started_at: string
  updated_at: string
  completed_at: string | null
}

/**
 * Update parameters for wizard session
 */
export interface UpdateSessionParams {
  currentStep?: number
  wizardData?: Partial<AnsweringServiceSetup>
  pathSelected?: 'self_serve' | 'concierge' | null
  status?: 'in_progress' | 'completed' | 'abandoned'
  buildStatus?: 'pending_build' | 'in_review' | 'ready' | 'call_scheduled' | null
}

/**
 * WizardService - Handles Answering Service onboarding wizard session persistence
 *
 * This service provides a clean abstraction layer over Supabase operations,
 * with proper error handling, validation, and type safety.
 */
export class WizardService {
  // SAFETY: Using any to avoid @supabase/ssr vs @supabase/supabase-js generic mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private supabase: SupabaseClient<any>) {}

  /**
   * Gets an existing in_progress session or creates a new one
   *
   * @param businessId - The ID of the business
   * @param userId - The ID of the user
   * @returns Wizard session (existing or newly created)
   * @throws WizardServiceError if query fails
   */
  async getOrCreateSession(
    businessId: string,
    userId: string
  ): Promise<WizardSession> {
    if (!businessId || typeof businessId !== 'string') {
      throw new WizardServiceError('Invalid business ID provided', 'INVALID_INPUT')
    }
    if (!userId || typeof userId !== 'string') {
      throw new WizardServiceError('Invalid user ID provided', 'INVALID_INPUT')
    }

    try {
      // Check for existing in_progress session
      const { data: existing, error: queryError } = await this.supabase
        .from('answering_service_wizard_sessions')
        .select('*')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (queryError) {
        throw new WizardServiceError(
          `Failed to query wizard sessions: ${queryError.message}`,
          queryError.code,
          queryError
        )
      }

      // Return existing session if found
      if (existing) {
        return this.parseSession(existing)
      }

      // Create new session
      const { data: created, error: createError } = await this.supabase
        .from('answering_service_wizard_sessions')
        .insert({
          business_id: businessId,
          user_id: userId,
          current_step: 0,
          wizard_data: {},
          path_selected: null,
          status: 'in_progress',
        })
        .select()
        .single()

      if (createError) {
        throw new WizardServiceError(
          `Failed to create wizard session: ${createError.message}`,
          createError.code,
          createError
        )
      }

      if (!created) {
        throw new WizardServiceError(
          'Failed to create wizard session: No data returned',
          'NO_DATA'
        )
      }

      return this.parseSession(created)
    } catch (error: unknown) {
      if (error instanceof WizardServiceError) {
        throw error
      }
      throw new WizardServiceError(
        'Unexpected error while getting or creating session',
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  /**
   * Updates a wizard session with partial data
   * Auto-updates updated_at timestamp via trigger
   *
   * @param sessionId - The ID of the session to update
   * @param params - Partial update parameters
   * @returns Updated wizard session
   * @throws WizardServiceError if update fails
   */
  async updateSession(
    sessionId: string,
    params: UpdateSessionParams
  ): Promise<WizardSession> {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new WizardServiceError('Invalid session ID provided', 'INVALID_INPUT')
    }

    try {
      const updateData: Record<string, unknown> = {}

      if (params.currentStep !== undefined) {
        updateData.current_step = params.currentStep
      }

      if (params.wizardData !== undefined) {
        updateData.wizard_data = params.wizardData
      }

      if (params.pathSelected !== undefined) {
        updateData.path_selected = params.pathSelected
      }

      if (params.status !== undefined) {
        updateData.status = params.status
        // Set completed_at when status changes to completed
        if (params.status === 'completed') {
          updateData.completed_at = new Date().toISOString()
          // Set build_status to pending_build when completing
          if (params.buildStatus === undefined) {
            updateData.build_status = 'pending_build'
          }
        }
      }

      if (params.buildStatus !== undefined) {
        updateData.build_status = params.buildStatus
      }

      if (Object.keys(updateData).length === 0) {
        throw new WizardServiceError('No update parameters provided', 'INVALID_INPUT')
      }

      const { data, error } = await this.supabase
        .from('answering_service_wizard_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new WizardServiceError('Session not found', 'NOT_FOUND', error)
        }
        throw new WizardServiceError(
          `Failed to update wizard session: ${error.message}`,
          error.code,
          error
        )
      }

      if (!data) {
        throw new WizardServiceError(
          'Failed to update wizard session: No data returned',
          'NO_DATA'
        )
      }

      return this.parseSession(data)
    } catch (error: unknown) {
      if (error instanceof WizardServiceError) {
        throw error
      }
      throw new WizardServiceError(
        'Unexpected error while updating session',
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  /**
   * Marks a wizard session as completed
   *
   * @param sessionId - The ID of the session to complete
   * @returns Completed wizard session
   * @throws WizardServiceError if update fails
   */
  async completeSession(sessionId: string): Promise<WizardSession> {
    return this.updateSession(sessionId, {
      status: 'completed',
      buildStatus: 'pending_build',
    })
  }

  /**
   * Gets abandoned sessions (in_progress but not updated in 24+ hours)
   * Used for analytics and cleanup
   *
   * @param businessId - Optional business ID to filter by
   * @returns Array of abandoned wizard sessions
   * @throws WizardServiceError if query fails
   */
  async getAbandonedSessions(businessId?: string): Promise<WizardSession[]> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      let query = this.supabase
        .from('answering_service_wizard_sessions')
        .select('*')
        .eq('status', 'in_progress')
        .lt('updated_at', twentyFourHoursAgo)

      if (businessId) {
        query = query.eq('business_id', businessId)
      }

      const { data, error } = await query.order('updated_at', { ascending: false })

      if (error) {
        throw new WizardServiceError(
          `Failed to get abandoned sessions: ${error.message}`,
          error.code,
          error
        )
      }

      if (!data) {
        return []
      }

      return data.map((session) => this.parseSession(session))
    } catch (error: unknown) {
      if (error instanceof WizardServiceError) {
        throw error
      }
      throw new WizardServiceError(
        'Unexpected error while getting abandoned sessions',
        'UNKNOWN_ERROR',
        error
      )
    }
  }

  /**
   * Parses raw database row into WizardSession type
   *
   * @param row - Raw database row
   * @returns Parsed wizard session
   */
  private parseSession(row: Record<string, unknown>): WizardSession {
    return {
      id: row.id as string,
      business_id: row.business_id as string,
      user_id: row.user_id as string,
      current_step: row.current_step as number,
      wizard_data: (row.wizard_data as Partial<AnsweringServiceSetup>) || {},
      path_selected: row.path_selected as 'self_serve' | 'concierge' | null,
      status: row.status as 'in_progress' | 'completed' | 'abandoned',
      build_status: (row.build_status as 'pending_build' | 'in_review' | 'ready' | 'call_scheduled' | null) || null,
      started_at: row.started_at as string,
      updated_at: row.updated_at as string,
      completed_at: (row.completed_at as string | null) || null,
    }
  }
}


