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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assignee_department: {
        Row: {
          assignee_gid: string
          departmentid: string
        }
        Insert: {
          assignee_gid: string
          departmentid: string
        }
        Update: {
          assignee_gid?: string
          departmentid?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignee_department_assignee_gid_fkey"
            columns: ["assignee_gid"]
            isOneToOne: true
            referencedRelation: "assignees"
            referencedColumns: ["gid"]
          },
          {
            foreignKeyName: "assignee_department_departmentid_fkey"
            columns: ["departmentid"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["departmentid"]
          },
        ]
      }
      assignees: {
        Row: {
          email: string | null
          gid: string
          name: string | null
        }
        Insert: {
          email?: string | null
          gid: string
          name?: string | null
        }
        Update: {
          email?: string | null
          gid?: string
          name?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          departmentid: string
          name_en: string
        }
        Insert: {
          departmentid: string
          name_en: string
        }
        Update: {
          departmentid?: string
          name_en?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          assignee_gid: string
          subtask_gid: string
        }
        Insert: {
          assignee_gid: string
          subtask_gid: string
        }
        Update: {
          assignee_gid?: string
          subtask_gid?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_assignee_gid_fkey"
            columns: ["assignee_gid"]
            isOneToOne: false
            referencedRelation: "assignees"
            referencedColumns: ["gid"]
          },
          {
            foreignKeyName: "followers_subtask_gid_fkey"
            columns: ["subtask_gid"]
            isOneToOne: false
            referencedRelation: "subtasks"
            referencedColumns: ["gid"]
          },
        ]
      }
      sections: {
        Row: {
          gid: string
          name: string | null
        }
        Insert: {
          gid: string
          name?: string | null
        }
        Update: {
          gid?: string
          name?: string | null
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          assignee_gid: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          due_on: string | null
          gid: string
          name: string | null
          parent_task_gid: string | null
        }
        Insert: {
          assignee_gid?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          due_on?: string | null
          gid: string
          name?: string | null
          parent_task_gid?: string | null
        }
        Update: {
          assignee_gid?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          due_on?: string | null
          gid?: string
          name?: string | null
          parent_task_gid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_assignee_gid_fkey"
            columns: ["assignee_gid"]
            isOneToOne: false
            referencedRelation: "assignees"
            referencedColumns: ["gid"]
          },
          {
            foreignKeyName: "subtasks_parent_task_gid_fkey"
            columns: ["parent_task_gid"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["gid"]
          },
        ]
      }
      sync_metadata: {
        Row: {
          key: string
          message: string | null
          record_count: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          key: string
          message?: string | null
          record_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          key?: string
          message?: string | null
          record_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_gid: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          due_on: string | null
          gid: string
          name: string | null
          project: string | null
          section_gid: string | null
        }
        Insert: {
          assignee_gid?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          due_on?: string | null
          gid: string
          name?: string | null
          project?: string | null
          section_gid?: string | null
        }
        Update: {
          assignee_gid?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          due_on?: string | null
          gid?: string
          name?: string | null
          project?: string | null
          section_gid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_gid_fkey"
            columns: ["assignee_gid"]
            isOneToOne: false
            referencedRelation: "assignees"
            referencedColumns: ["gid"]
          },
          {
            foreignKeyName: "tasks_section_gid_fkey"
            columns: ["section_gid"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["gid"]
          },
        ]
      }
      user_assignees: {
        Row: {
          assignee_gid: string | null
          uid: string
        }
        Insert: {
          assignee_gid?: string | null
          uid: string
        }
        Update: {
          assignee_gid?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assignees_assignee_gid_fkey"
            columns: ["assignee_gid"]
            isOneToOne: false
            referencedRelation: "assignees"
            referencedColumns: ["gid"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: string | null
          uid: string
        }
        Insert: {
          role?: string | null
          uid: string
        }
        Update: {
          role?: string | null
          uid?: string
        }
        Relationships: []
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