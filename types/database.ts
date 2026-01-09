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
      folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          phone: string | null
          post_author_id: string | null
          post_id: string | null
          session_id: string | null
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          phone?: string | null
          post_author_id?: string | null
          post_id?: string | null
          session_id?: string | null
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          phone?: string | null
          post_author_id?: string | null
          post_id?: string | null
          session_id?: string | null
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      gen_history: {
        Row: {
          aspect_ratio: string
          created_at: string
          id: string
          image_url: string
          model: string
          negative_prompt: string | null
          prompt: string
          user_id: string
        }
        Insert: {
          aspect_ratio: string
          created_at?: string
          id?: string
          image_url: string
          model: string
          negative_prompt?: string | null
          prompt: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          id?: string
          image_url?: string
          model?: string
          negative_prompt?: string | null
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          source: string | null
          type: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          type: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      post_heatmap_attention: {
        Row: {
          created_at: string | null
          id: string
          page_url: string | null
          post_id: string
          section_id: string
          session_id: string
          time_visible_ms: number
          updated_at: string | null
          user_agent: string | null
          view_count: number | null
          viewport_height: number
          viewport_width: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_url?: string | null
          post_id: string
          section_id: string
          session_id: string
          time_visible_ms: number
          updated_at?: string | null
          user_agent?: string | null
          view_count?: number | null
          viewport_height: number
          viewport_width: number
        }
        Update: {
          created_at?: string | null
          id?: string
          page_url?: string | null
          post_id?: string
          section_id?: string
          session_id?: string
          time_visible_ms?: number
          updated_at?: string | null
          user_agent?: string | null
          view_count?: number | null
          viewport_height?: number
          viewport_width?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_heatmap_attention_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_heatmap_clicks: {
        Row: {
          content_container_selector: string | null
          content_x: number | null
          content_y: number | null
          created_at: string | null
          element_class: string | null
          element_id: string | null
          element_tag: string | null
          heatmap_id: string | null
          id: string
          is_dead_click: boolean | null
          page_url: string | null
          post_id: string
          scroll_y: number | null
          session_id: string
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          x_percent: number
          y_percent: number
        }
        Insert: {
          content_container_selector?: string | null
          content_x?: number | null
          content_y?: number | null
          created_at?: string | null
          element_class?: string | null
          element_id?: string | null
          element_tag?: string | null
          heatmap_id?: string | null
          id?: string
          is_dead_click?: boolean | null
          page_url?: string | null
          post_id: string
          scroll_y?: number | null
          session_id: string
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          x_percent: number
          y_percent: number
        }
        Update: {
          content_container_selector?: string | null
          content_x?: number | null
          content_y?: number | null
          created_at?: string | null
          element_class?: string | null
          element_id?: string | null
          element_tag?: string | null
          heatmap_id?: string | null
          id?: string
          is_dead_click?: boolean | null
          page_url?: string | null
          post_id?: string
          scroll_y?: number | null
          session_id?: string
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          x_percent?: number
          y_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_heatmap_clicks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_heatmap_cta: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          cta_id: string
          id: string
          page_url: string | null
          post_id: string
          seen_at: string | null
          session_id: string
          updated_at: string | null
          user_agent: string | null
          viewport_height: number | null
          viewport_width: number | null
          was_clicked: boolean
          was_seen: boolean
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          cta_id: string
          id?: string
          page_url?: string | null
          post_id: string
          seen_at?: string | null
          session_id: string
          updated_at?: string | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          was_clicked?: boolean
          was_seen?: boolean
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          cta_id?: string
          id?: string
          page_url?: string | null
          post_id?: string
          seen_at?: string | null
          session_id?: string
          updated_at?: string | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          was_clicked?: boolean
          was_seen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "post_heatmap_cta_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_heatmap_rage_clicks: {
        Row: {
          click_count: number
          created_at: string | null
          element_class: string | null
          element_id: string | null
          element_tag: string | null
          heatmap_id: string | null
          id: string
          page_url: string | null
          post_id: string
          session_id: string
          time_window_ms: number
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          x_percent: number
          y_percent: number
        }
        Insert: {
          click_count: number
          created_at?: string | null
          element_class?: string | null
          element_id?: string | null
          element_tag?: string | null
          heatmap_id?: string | null
          id?: string
          page_url?: string | null
          post_id: string
          session_id: string
          time_window_ms: number
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          x_percent: number
          y_percent: number
        }
        Update: {
          click_count?: number
          created_at?: string | null
          element_class?: string | null
          element_id?: string | null
          element_tag?: string | null
          heatmap_id?: string | null
          id?: string
          page_url?: string | null
          post_id?: string
          session_id?: string
          time_window_ms?: number
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          x_percent?: number
          y_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_heatmap_rage_clicks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_heatmap_scroll: {
        Row: {
          created_at: string | null
          id: string
          max_scroll_depth_percent: number
          page_url: string | null
          post_id: string
          scroll_bucket: string
          session_id: string
          updated_at: string | null
          user_agent: string | null
          viewport_height: number
          viewport_width: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_scroll_depth_percent: number
          page_url?: string | null
          post_id: string
          scroll_bucket: string
          session_id: string
          updated_at?: string | null
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
        }
        Update: {
          created_at?: string | null
          id?: string
          max_scroll_depth_percent?: number
          page_url?: string | null
          post_id?: string
          scroll_bucket?: string
          session_id?: string
          updated_at?: string | null
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_heatmap_scroll_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          component_order: Json | null
          content: string
          created_at: string
          cta_enabled: boolean | null
          folder_id: string | null
          folder_slug: string | null
          id: string
          is_draft: boolean
          next_post_id: string | null
          post_slug: string | null
          quiz_id: string | null
          quiz_show_description: boolean | null
          quiz_show_responses_button: boolean | null
          quiz_show_responses_preview: boolean | null
          quiz_skip_contact_collection: boolean | null
          rating_enabled: boolean | null
          status: string
          styles: Json | null
          template_data: Json | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          component_order?: Json | null
          content: string
          created_at?: string
          cta_enabled?: boolean | null
          folder_id?: string | null
          folder_slug?: string | null
          id?: string
          is_draft?: boolean
          next_post_id?: string | null
          post_slug?: string | null
          quiz_id?: string | null
          quiz_show_description?: boolean | null
          quiz_show_responses_button?: boolean | null
          quiz_show_responses_preview?: boolean | null
          quiz_skip_contact_collection?: boolean | null
          rating_enabled?: boolean | null
          status?: string
          styles?: Json | null
          template_data?: Json | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          component_order?: Json | null
          content?: string
          created_at?: string
          cta_enabled?: boolean | null
          folder_id?: string | null
          folder_slug?: string | null
          id?: string
          is_draft?: boolean
          next_post_id?: string | null
          post_slug?: string | null
          quiz_id?: string | null
          quiz_show_description?: boolean | null
          quiz_show_responses_button?: boolean | null
          quiz_show_responses_preview?: boolean | null
          quiz_skip_contact_collection?: boolean | null
          rating_enabled?: boolean | null
          status?: string
          styles?: Json | null
          template_data?: Json | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_next_post_id_fkey"
            columns: ["next_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          answers: Json
          completed_at: string | null
          contact_info: Json | null
          id: string
          quiz_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          contact_info?: Json | null
          id?: string
          quiz_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          contact_info?: Json | null
          id?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          conclusion_page: Json
          contact_settings: Json
          cover_page: Json
          created_at: string | null
          id: string
          questions: Json
          slug: string | null
          status: string
          styles: Json
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conclusion_page: Json
          contact_settings: Json
          cover_page: Json
          created_at?: string | null
          id?: string
          questions: Json
          slug?: string | null
          status?: string
          styles: Json
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conclusion_page?: Json
          contact_settings?: Json
          cover_page?: Json
          created_at?: string | null
          id?: string
          questions?: Json
          slug?: string | null
          status?: string
          styles?: Json
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          post_id: string
          session_id: string
          stars: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          session_id: string
          stars: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          session_id?: string
          stars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          count: number
          emoji: string
          id: string
          post_id: string
        }
        Insert: {
          count?: number
          emoji: string
          id?: string
          post_id: string
        }
        Update: {
          count?: number
          emoji?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      video_timestamps: {
        Row: {
          created_at: string | null
          id: string
          label: string
          post_id: string | null
          timestamp_seconds: number
          updated_at: string | null
          user_id: string | null
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          post_id?: string | null
          timestamp_seconds: number
          updated_at?: string | null
          user_id?: string | null
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          post_id?: string | null
          timestamp_seconds?: number
          updated_at?: string | null
          user_id?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_timestamps_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
