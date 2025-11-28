/**
 * Stratosphere Database Types
 *
 * This file contains TypeScript types for the Supabase database.
 * Regenerate this file after schema changes using:
 *
 * npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 *
 * For now, this provides placeholder types that match our schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type UserRole = 'PRIMARY' | 'BACKUP' | 'OBSERVER' | 'EXECUTIVE'
export type AccountManagerStyle = 'SUCCINCT' | 'COLLABORATIVE' | 'EXECUTIVE'
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'
export type TouchpointType = 'EMAIL_SENT' | 'EMAIL_RECEIVED' | 'MEETING' | 'SLACK' | 'TICKET_REPLY'
export type EventType = 'HOLIDAY' | 'ALGORITHM_UPDATE' | 'CLIENT_PROMO' | 'INDUSTRY_EVENT'
export type ImpactCategory = 'TRAFFIC' | 'RANKING' | 'CONVERSION'
export type ExperimentSnapshotType = 'START' | 'MID' | 'END'
export type SegmentType = 'SUBDOMAIN' | 'CONTENT_TYPE' | 'PAGE_GROUP'
export type ChangeType = 'NEW_CONTENT' | 'RANKING_GAIN' | 'BACKLINK_SPIKE' | 'TITLE_CHANGE'
export type DeploymentType = 'CODE' | 'CONTENT' | 'REDIRECT' | 'SITEMAP' | 'ROBOTS'
export type RecommendationCategory = 'CONTENT' | 'TECHNICAL' | 'LINK' | 'CONVERSION'
export type SummaryPeriod = 'WEEKLY' | 'MONTHLY'
export type ApiType = 'GSC' | 'SERPER' | 'GEMINI'
export type InteractionType = 'BRIEFING' | 'ALERT_TRIAGE' | 'DRAFT' | 'ANALYSIS' | 'REPORT'
export type FeedbackType = 'HELPFUL' | 'NOT_HELPFUL' | 'INCORRECT'
export type DefaultView = 'TRIAGE' | 'CALENDAR' | 'CLIENT_LIST'
export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          display_name: string
          account_manager_style: AccountManagerStyle
          default_view: DefaultView
          notification_preferences: Json
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          account_manager_style?: AccountManagerStyle
          default_view?: DefaultView
          notification_preferences?: Json
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          account_manager_style?: AccountManagerStyle
          default_view?: DefaultView
          notification_preferences?: Json
          avatar_url?: string | null
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          domain: string
          gsc_property_url: string | null
          risk_score: number | null
          brand_voice_guidelines: string | null
          industry: string | null
          timezone: string
          is_active: boolean
          logo_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          domain: string
          gsc_property_url?: string | null
          risk_score?: number | null
          brand_voice_guidelines?: string | null
          industry?: string | null
          timezone?: string
          is_active?: boolean
          logo_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          domain?: string
          gsc_property_url?: string | null
          risk_score?: number | null
          brand_voice_guidelines?: string | null
          industry?: string | null
          timezone?: string
          is_active?: boolean
          logo_url?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      user_client_assignments: {
        Row: {
          id: string
          user_id: string
          client_id: string
          role: UserRole
          assigned_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          role?: UserRole
          assigned_at?: string
          ended_at?: string | null
        }
        Update: {
          role?: UserRole
          ended_at?: string | null
        }
      }
      service_tiers: {
        Row: {
          id: string
          tier_name: string
          included_services: string[]
          description: string | null
          monthly_hours: number | null
          priority_level: number
          created_at: string
        }
        Insert: {
          id?: string
          tier_name: string
          included_services: string[]
          description?: string | null
          monthly_hours?: number | null
          priority_level?: number
          created_at?: string
        }
        Update: {
          tier_name?: string
          included_services?: string[]
          description?: string | null
          monthly_hours?: number | null
          priority_level?: number
        }
      }
      client_entitlements: {
        Row: {
          client_id: string
          tier_id: string | null
          custom_exclusions: string[]
          custom_inclusions: string[]
          updated_at: string
        }
        Insert: {
          client_id: string
          tier_id?: string | null
          custom_exclusions?: string[]
          custom_inclusions?: string[]
          updated_at?: string
        }
        Update: {
          tier_id?: string | null
          custom_exclusions?: string[]
          custom_inclusions?: string[]
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          client_id: string
          severity: AlertSeverity
          signal: string
          context: string | null
          recommended_action: string | null
          alert_payload: Json | null
          is_dismissed: boolean
          is_read: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          severity: AlertSeverity
          signal: string
          context?: string | null
          recommended_action?: string | null
          alert_payload?: Json | null
          is_dismissed?: boolean
          is_read?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          severity?: AlertSeverity
          signal?: string
          context?: string | null
          recommended_action?: string | null
          alert_payload?: Json | null
          is_dismissed?: boolean
          is_read?: boolean
          expires_at?: string | null
        }
      }
      client_health_history: {
        Row: {
          id: string
          client_id: string
          recorded_date: string
          health_score: number | null
          traffic_trend_score: number | null
          ops_velocity_score: number | null
          sentiment_score: number | null
          contributing_factors: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          recorded_date: string
          health_score?: number | null
          traffic_trend_score?: number | null
          ops_velocity_score?: number | null
          sentiment_score?: number | null
          contributing_factors?: Json | null
          created_at?: string
        }
        Update: {
          health_score?: number | null
          traffic_trend_score?: number | null
          ops_velocity_score?: number | null
          sentiment_score?: number | null
          contributing_factors?: Json | null
        }
      }
      churn_prediction_scores: {
        Row: {
          id: string
          client_id: string
          prediction_date: string
          churn_probability: number | null
          model_version: string | null
          contributing_factors: Json | null
          recommended_intervention: string | null
          intervention_taken: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          prediction_date: string
          churn_probability?: number | null
          model_version?: string | null
          contributing_factors?: Json | null
          recommended_intervention?: string | null
          intervention_taken?: string | null
          created_at?: string
        }
        Update: {
          churn_probability?: number | null
          model_version?: string | null
          contributing_factors?: Json | null
          recommended_intervention?: string | null
          intervention_taken?: string | null
        }
      }
      calendar_events: {
        Row: {
          id: string
          event_name: string
          event_type: EventType
          event_date: string
          event_end_date: string | null
          geo_scope: string[]
          impact_category: ImpactCategory | null
          expected_impact_pct: number | null
          notes: string | null
          source_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_name: string
          event_type: EventType
          event_date: string
          event_end_date?: string | null
          geo_scope?: string[]
          impact_category?: ImpactCategory | null
          expected_impact_pct?: number | null
          notes?: string | null
          source_url?: string | null
          created_at?: string
        }
        Update: {
          event_name?: string
          event_type?: EventType
          event_date?: string
          event_end_date?: string | null
          geo_scope?: string[]
          impact_category?: ImpactCategory | null
          expected_impact_pct?: number | null
          notes?: string | null
          source_url?: string | null
        }
      }
      gsc_aggregates: {
        Row: {
          id: string
          client_id: string
          aggregation_date: string
          segment_type: SegmentType
          segment_value: string
          total_clicks: number
          total_impressions: number
          avg_position: number | null
          avg_ctr: number | null
          clicks_delta_pct: number | null
          impressions_delta_pct: number | null
          position_delta: number | null
          anomaly_detected: boolean
          anomaly_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          aggregation_date: string
          segment_type: SegmentType
          segment_value: string
          total_clicks?: number
          total_impressions?: number
          avg_position?: number | null
          avg_ctr?: number | null
          clicks_delta_pct?: number | null
          impressions_delta_pct?: number | null
          position_delta?: number | null
          anomaly_detected?: boolean
          anomaly_score?: number | null
          created_at?: string
        }
        Update: {
          total_clicks?: number
          total_impressions?: number
          avg_position?: number | null
          avg_ctr?: number | null
          clicks_delta_pct?: number | null
          impressions_delta_pct?: number | null
          position_delta?: number | null
          anomaly_detected?: boolean
          anomaly_score?: number | null
        }
      }
      ai_interaction_logs: {
        Row: {
          id: string
          user_id: string | null
          client_id: string | null
          interaction_type: InteractionType
          prompt_hash: string | null
          prompt_preview: string | null
          response_preview: string | null
          input_tokens: number | null
          output_tokens: number | null
          latency_ms: number | null
          model_used: string | null
          constraint_violations: string[] | null
          user_feedback: FeedbackType | null
          feedback_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          client_id?: string | null
          interaction_type: InteractionType
          prompt_hash?: string | null
          prompt_preview?: string | null
          response_preview?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          latency_ms?: number | null
          model_used?: string | null
          constraint_violations?: string[] | null
          user_feedback?: FeedbackType | null
          feedback_text?: string | null
          created_at?: string
        }
        Update: {
          user_feedback?: FeedbackType | null
          feedback_text?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_health_score: {
        Args: { p_client_id: string }
        Returns: number
      }
      check_data_threshold: {
        Args: { p_client_id: string }
        Returns: Json
      }
      get_gsc_cache_freshness: {
        Args: { p_client_id: string }
        Returns: Json
      }
      calculate_rule_based_churn: {
        Args: { p_client_id: string }
        Returns: number
      }
      get_clients_needing_attention: {
        Args: { p_user_id: string }
        Returns: {
          client_id: string
          client_name: string
          health_score: number
          churn_probability: number
          undismissed_alerts: number
          days_since_touchpoint: number
          attention_reason: string
        }[]
      }
    }
    Enums: {
      user_role: UserRole
      account_manager_style: AccountManagerStyle
      alert_severity: AlertSeverity
      touchpoint_type: TouchpointType
      event_type: EventType
      impact_category: ImpactCategory
      experiment_snapshot_type: ExperimentSnapshotType
      segment_type: SegmentType
      change_type: ChangeType
      deployment_type: DeploymentType
      recommendation_category: RecommendationCategory
      summary_period: SummaryPeriod
      api_type: ApiType
      interaction_type: InteractionType
      feedback_type: FeedbackType
      default_view: DefaultView
      experiment_status: ExperimentStatus
    }
  }
}

// Convenience types for common queries
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']

export type Alert = Database['public']['Tables']['alerts']['Row']
export type AlertInsert = Database['public']['Tables']['alerts']['Insert']
export type AlertUpdate = Database['public']['Tables']['alerts']['Update']

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export type ClientHealthHistory = Database['public']['Tables']['client_health_history']['Row']
export type ChurnPrediction = Database['public']['Tables']['churn_prediction_scores']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type GscAggregate = Database['public']['Tables']['gsc_aggregates']['Row']
export type AiInteractionLog = Database['public']['Tables']['ai_interaction_logs']['Row']

// Extended types with joins
export interface ClientWithHealth extends Client {
  health_history?: ClientHealthHistory[]
  churn_prediction?: ChurnPrediction | null
  active_alerts?: Alert[]
}

export interface ClientWithEntitlements extends Client {
  entitlements?: {
    tier: Database['public']['Tables']['service_tiers']['Row'] | null
    custom_exclusions: string[]
    custom_inclusions: string[]
  }
}
