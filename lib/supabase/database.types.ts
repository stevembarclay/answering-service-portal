// Minimal Database type stub covering the tables this app uses.
// Replace with generated types from Supabase CLI once you have a project:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
// Or locally:
//   npx supabase gen types typescript --local > lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      answering_service_wizard_sessions: {
        Row: {
          id: string
          business_id: string
          user_id: string
          current_step: number
          wizard_data: Json
          path_selected: 'self_serve' | 'concierge' | null
          status: 'in_progress' | 'completed' | 'abandoned'
          build_status: 'pending_build' | 'in_review' | 'ready' | 'call_scheduled' | null
          started_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          user_id: string
          current_step?: number
          wizard_data?: Json
          path_selected?: 'self_serve' | 'concierge' | null
          status?: 'in_progress' | 'completed' | 'abandoned'
          build_status?: 'pending_build' | 'in_review' | 'ready' | 'call_scheduled' | null
          started_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          user_id?: string
          current_step?: number
          wizard_data?: Json
          path_selected?: 'self_serve' | 'concierge' | null
          status?: 'in_progress' | 'completed' | 'abandoned'
          build_status?: 'pending_build' | 'in_review' | 'ready' | 'call_scheduled' | null
          started_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      users_businesses: {
        Row: {
          user_id: string
          business_id: string
          role: string
          last_login_at: string | null
        }
        Insert: {
          user_id: string
          business_id: string
          role?: string
        }
        Update: {
          user_id?: string
          business_id?: string
          role?: string
          last_login_at?: string | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          id: string
          name: string
          enabled_modules: Json
        }
        Insert: {
          id?: string
          name: string
          enabled_modules?: Json
        }
        Update: {
          id?: string
          name?: string
          enabled_modules?: Json
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          id: string
          business_id: string
          timestamp: string
          caller_name: string | null
          caller_number: string | null
          callback_number: string | null
          call_type: string
          direction: 'inbound' | 'outbound'
          duration_seconds: number
          telephony_status: 'completed' | 'missed' | 'voicemail'
          message: string
          has_recording: boolean
          priority: 'high' | 'medium' | 'low'
          portal_status: 'new' | 'read' | 'flagged_qa' | 'assigned' | 'resolved'
          workflow_status_id: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          timestamp: string
          caller_name?: string | null
          caller_number?: string | null
          callback_number?: string | null
          call_type?: string
          direction: 'inbound' | 'outbound'
          duration_seconds?: number
          telephony_status: 'completed' | 'missed' | 'voicemail'
          message?: string
          has_recording?: boolean
          priority?: 'high' | 'medium' | 'low'
          portal_status?: 'new' | 'read' | 'flagged_qa' | 'assigned' | 'resolved'
          workflow_status_id?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          timestamp?: string
          caller_name?: string | null
          caller_number?: string | null
          callback_number?: string | null
          call_type?: string
          direction?: 'inbound' | 'outbound'
          duration_seconds?: number
          telephony_status?: 'completed' | 'missed' | 'voicemail'
          message?: string
          has_recording?: boolean
          priority?: 'high' | 'medium' | 'low'
          portal_status?: 'new' | 'read' | 'flagged_qa' | 'assigned' | 'resolved'
          workflow_status_id?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_actions: {
        Row: {
          id: string
          call_log_id: string
          business_id: string
          type: 'priority_updated' | 'flagged_qa' | 'status_changed' | 'workflow_status_changed' | 'assigned'
          by_user_id: string
          at: string
          from_value: string | null
          to_value: string | null
        }
        Insert: {
          id?: string
          call_log_id: string
          business_id: string
          type: 'priority_updated' | 'flagged_qa' | 'status_changed' | 'workflow_status_changed' | 'assigned'
          by_user_id: string
          at?: string
          from_value?: string | null
          to_value?: string | null
        }
        Update: {
          id?: string
          call_log_id?: string
          business_id?: string
          type?: 'priority_updated' | 'flagged_qa' | 'status_changed' | 'workflow_status_changed' | 'assigned'
          by_user_id?: string
          at?: string
          from_value?: string | null
          to_value?: string | null
        }
        Relationships: []
      }
      business_message_statuses: {
        Row: {
          id: string
          business_id: string
          label: string
          color: string
          is_open: boolean
          sort_order: number
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          label: string
          color?: string
          is_open?: boolean
          sort_order?: number
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          label?: string
          color?: string
          is_open?: boolean
          sort_order?: number
          is_system?: boolean
          created_at?: string
        }
        Relationships: []
      }
      message_notes: {
        Row: {
          id: string
          call_log_id: string
          business_id: string
          user_id: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          call_log_id: string
          business_id: string
          user_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          call_log_id?: string
          business_id?: string
          user_id?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
