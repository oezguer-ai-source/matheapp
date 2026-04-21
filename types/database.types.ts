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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignment_classes: {
        Row: {
          assigned_at: string
          assignment_id: string
          class_id: string
        }
        Insert: {
          assigned_at?: string
          assignment_id: string
          class_id: string
        }
        Update: {
          assigned_at?: string
          assignment_id?: string
          class_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_classes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_items: {
        Row: {
          assignment_id: string
          correct_options: Json | null
          created_at: string
          id: string
          item_type: string
          options: Json | null
          question: string
          sort_order: number
        }
        Insert: {
          assignment_id: string
          correct_options?: Json | null
          created_at?: string
          id?: string
          item_type: string
          options?: Json | null
          question: string
          sort_order?: number
        }
        Update: {
          assignment_id?: string
          correct_options?: Json | null
          created_at?: string
          id?: string
          item_type?: string
          options?: Json | null
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignment_items_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attempts_used: number
          created_at: string
          duration_seconds: number | null
          id: string
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          attempts_used?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          attempts_used?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          description: string
          due_date: string
          id: string
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          due_date: string
          id?: string
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: []
      }
      avatar_state: {
        Row: {
          child_id: string
          dino_name: string
          level: number
          updated_at: string
          xp: number
        }
        Insert: {
          child_id: string
          dino_name?: string
          level?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          child_id?: string
          dino_name?: string
          level?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          child_id: string
          class_id: string | null
          created_at: string
          game_key: string
          id: string
          score: number
        }
        Insert: {
          child_id: string
          class_id?: string | null
          created_at?: string
          game_key: string
          id?: string
          score: number
        }
        Update: {
          child_id?: string
          class_id?: string | null
          created_at?: string
          game_key?: string
          id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          class_id: string | null
          created_at: string
          id: string
          recipient_id: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          class_id?: string | null
          created_at?: string
          id?: string
          recipient_id?: string | null
          sender_id: string
          subject?: string
        }
        Update: {
          body?: string
          class_id?: string | null
          created_at?: string
          id?: string
          recipient_id?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          class_id: string | null
          created_at: string
          display_name: string
          grade_level: number | null
          pin_hint: string | null
          role: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          display_name: string
          grade_level?: number | null
          pin_hint?: string | null
          role: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          display_name?: string
          grade_level?: number | null
          pin_hint?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_entries: {
        Row: {
          child_id: string
          correct: boolean
          created_at: string
          grade: number
          id: string
          operation_type: string
          points_earned: number
        }
        Insert: {
          child_id: string
          correct: boolean
          created_at?: string
          grade: number
          id?: string
          operation_type: string
          points_earned?: number
        }
        Update: {
          child_id?: string
          correct?: boolean
          created_at?: string
          grade?: number
          id?: string
          operation_type?: string
          points_earned?: number
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          subscription_tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subscription_tier?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subscription_tier?: string
        }
        Relationships: []
      }
      streak_state: {
        Row: {
          best_streak: number
          child_id: string
          current_streak: number
          last_active_day: string | null
          updated_at: string
        }
        Insert: {
          best_streak?: number
          child_id: string
          current_streak?: number
          last_active_day?: string | null
          updated_at?: string
        }
        Update: {
          best_streak?: number
          child_id?: string
          current_streak?: number
          last_active_day?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      submission_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          item_id: string
          selected_options: Json | null
          submission_id: string
          text_answer: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          item_id: string
          selected_options?: Json | null
          submission_id: string
          text_answer?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          item_id?: string
          selected_options?: Json | null
          submission_id?: string
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "assignment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
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
