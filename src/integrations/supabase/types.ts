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
      signals: {
        Row: {
          id: string
          symbol: string
          timeframe: string
          signal_type: string
          entry_price: number
          stop_loss: number
          target_price: number
          confidence: number
          reasons: string[]
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          symbol: string
          timeframe: string
          signal_type: string
          entry_price: number
          stop_loss: number
          target_price: number
          confidence: number
          reasons: string[]
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          timeframe?: string
          signal_type?: string
          entry_price?: number
          stop_loss?: number
          target_price?: number
          confidence?: number
          reasons?: string[]
          status?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          status: string
          plan: string
          currency: string
          stripe_price_id: string
          stripe_subscription_id: string | null
          current_period_end: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status: string
          plan: string
          currency?: string
          stripe_price_id?: string
          stripe_subscription_id?: string | null
          current_period_end?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          plan?: string
          currency?: string
          stripe_price_id?: string
          stripe_subscription_id?: string | null
          current_period_end?: string | null
          created_at?: string
        }
        Relationships: []
      }
      boom_hours: {
        Row: {
          id: string
          title: string
          time_gmt: string
          time_wat: string
          pairs: string[]
          days: string
          description: string
          volatility: number
          badge: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          time_gmt: string
          time_wat: string
          pairs?: string[]
          days?: string
          description?: string
          volatility?: number
          badge?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          time_gmt?: string
          time_wat?: string
          pairs?: string[]
          days?: string
          description?: string
          volatility?: number
          badge?: string
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          title: string
          content: string
          pair: string
          signal_type: string
          image_url: string | null
          audio_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content?: string
          pair?: string
          signal_type?: string
          image_url?: string | null
          audio_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          pair?: string
          signal_type?: string
          image_url?: string | null
          audio_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      boom_times: {
        Row: {
          id: string
          pair: string
          boom_time: string
          confidence: number
          result: string
          image_url: string | null
          audio_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pair: string
          boom_time: string
          confidence?: number
          result?: string
          image_url?: string | null
          audio_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pair?: string
          boom_time?: string
          confidence?: number
          result?: string
          image_url?: string | null
          audio_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      boom_votes: {
        Row: {
          id: string
          user_id: string
          boom_time_id: string
          vote_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          boom_time_id: string
          vote_type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          boom_time_id?: string
          vote_type?: string
          created_at?: string
        }
        Relationships: []
      }
      boom_comments: {
        Row: {
          id: string
          user_id: string
          boom_time_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          boom_time_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          boom_time_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users: {
        Args: Record<string, never>
        Returns: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          last_sign_in: string | null
        }[]
      }
      get_users_count: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
