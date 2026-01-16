export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      market_analysis: {
        Row: {
          analyzed_at: string
          confidence: number
          created_at: string
          ema_long: number | null
          ema_short: number | null
          entry_price: number | null
          id: string
          pair_id: string
          reasons: string[] | null
          rsi: number | null
          signal_type: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          timeframe: string
          trend: string | null
        }
        Insert: {
          analyzed_at?: string
          confidence: number
          created_at?: string
          ema_long?: number | null
          ema_short?: number | null
          entry_price?: number | null
          id?: string
          pair_id: string
          reasons?: string[] | null
          rsi?: number | null
          signal_type: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          timeframe?: string
          trend?: string | null
        }
        Update: {
          analyzed_at?: string
          confidence?: number
          created_at?: string
          ema_long?: number | null
          ema_short?: number | null
          entry_price?: number | null
          id?: string
          pair_id?: string
          reasons?: string[] | null
          rsi?: number | null
          signal_type?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          timeframe?: string
          trend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_analysis_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "trading_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      market_prices: {
        Row: {
          change_percent: number | null
          high_24h: number | null
          id: string
          low_24h: number | null
          pair_id: string
          price: number
          symbol: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          change_percent?: number | null
          high_24h?: number | null
          id?: string
          low_24h?: number | null
          pair_id: string
          price: number
          symbol: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          change_percent?: number | null
          high_24h?: number | null
          id?: string
          low_24h?: number | null
          pair_id?: string
          price?: number
          symbol?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: true
            referencedRelation: "trading_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          plan: Database["public"]["Enums"]["plan_type"]
          plan_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          closed_at: string | null
          confidence: number
          created_at: string
          created_by: string | null
          entry_price: number
          id: string
          pair_id: string
          reasons: string[] | null
          signal_type: string
          status: string
          stop_loss: number
          take_profit: number
          timeframe: string
        }
        Insert: {
          closed_at?: string | null
          confidence: number
          created_at?: string
          created_by?: string | null
          entry_price: number
          id?: string
          pair_id: string
          reasons?: string[] | null
          signal_type: string
          status?: string
          stop_loss: number
          take_profit: number
          timeframe?: string
        }
        Update: {
          closed_at?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          entry_price?: number
          id?: string
          pair_id?: string
          reasons?: string[] | null
          signal_type?: string
          status?: string
          stop_loss?: number
          take_profit?: number
          timeframe?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "trading_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_pairs: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          is_premium: boolean
          name: string
          symbol: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_premium?: boolean
          name: string
          symbol: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_premium?: boolean
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_subscriptions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          min_confidence: number | null
          pairs: string[] | null
          phone_number: string
          timeframes: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_confidence?: number | null
          pairs?: string[] | null
          phone_number: string
          timeframes?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_confidence?: number | null
          pairs?: string[] | null
          phone_number?: string
          timeframes?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["plan_type"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      plan_type: "free" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      plan_type: ["free", "premium"],
    },
  },
} as const
