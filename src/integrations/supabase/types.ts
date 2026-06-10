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
      announcements: {
        Row: {
          body: string
          congregation_id: string | null
          created_at: string
          created_by: string | null
          department: Database["public"]["Enums"]["department_type"] | null
          expires_at: string | null
          id: string
          is_global: boolean
          priority: string
          published_at: string
          title: string
        }
        Insert: {
          body: string
          congregation_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_type"] | null
          expires_at?: string | null
          id?: string
          is_global?: boolean
          priority?: string
          published_at?: string
          title: string
        }
        Update: {
          body?: string
          congregation_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_type"] | null
          expires_at?: string | null
          id?: string
          is_global?: boolean
          priority?: string
          published_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      congregations: {
        Row: {
          active_departments: string[] | null
          address: string | null
          assistant_pastors: string | null
          city: string | null
          created_at: string
          id: string
          is_headquarters: boolean
          latitude: number | null
          lead_pastor: string | null
          longitude: number | null
          name: string
          phone: string | null
          service_schedule: Json | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active_departments?: string[] | null
          address?: string | null
          assistant_pastors?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_headquarters?: boolean
          latitude?: number | null
          lead_pastor?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          service_schedule?: Json | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active_departments?: string[] | null
          address?: string | null
          assistant_pastors?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_headquarters?: boolean
          latitude?: number | null
          lead_pastor?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          service_schedule?: Json | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      departamentos: {
        Row: {
          cor: string | null
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          sigla: string | null
          updated_at: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          sigla?: string | null
          updated_at?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          sigla?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ebd_lessons: {
        Row: {
          congregation_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          daily_readings: Json | null
          id: string
          is_global: boolean
          lesson_date: string
          notice: string | null
          reference: string | null
          title: string
          updated_at: string
        }
        Insert: {
          congregation_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          daily_readings?: Json | null
          id?: string
          is_global?: boolean
          lesson_date: string
          notice?: string | null
          reference?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          congregation_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          daily_readings?: Json | null
          id?: string
          is_global?: boolean
          lesson_date?: string
          notice?: string | null
          reference?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebd_lessons_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          congregation_id: string | null
          created_at: string
          created_by: string | null
          department: Database["public"]["Enums"]["department_type"] | null
          description: string | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_global: boolean
          location: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_type"] | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_global?: boolean
          location?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_type"] | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_global?: boolean
          location?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          active: boolean
          address: string | null
          address_number: string | null
          birth_date: string | null
          city: string | null
          congregation_id: string
          created_at: string
          department: Database["public"]["Enums"]["department_type"] | null
          email: string | null
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          notes: string | null
          phone: string | null
          position: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          address_number?: string | null
          birth_date?: string | null
          city?: string | null
          congregation_id: string
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          email?: string | null
          full_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          address_number?: string | null
          birth_date?: string | null
          city?: string | null
          congregation_id?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          email?: string | null
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          congregation_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          congregation_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          congregation_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          congregation_id: string | null
          created_at: string
          department: Database["public"]["Enums"]["department_type"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_admin_congregation: {
        Args: { _congregation_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_sede_admin: { Args: { _user_id: string }; Returns: boolean }
      user_congregation: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin_sede"
        | "admin_congregacao"
        | "lider_departamento"
        | "membro"
      department_type:
        | "UMADB"
        | "UFADEB"
        | "Alpha Kids"
        | "CREIO"
        | "Missoes"
        | "Assistencia Social"
        | "EBD"
        | "Teologia FAESP"
      event_type:
        | "culto"
        | "evento"
        | "festividade"
        | "reuniao"
        | "escala"
        | "ensaio"
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
      app_role: [
        "admin_sede",
        "admin_congregacao",
        "lider_departamento",
        "membro",
      ],
      department_type: [
        "UMADB",
        "UFADEB",
        "Alpha Kids",
        "CREIO",
        "Missoes",
        "Assistencia Social",
        "EBD",
        "Teologia FAESP",
      ],
      event_type: [
        "culto",
        "evento",
        "festividade",
        "reuniao",
        "escala",
        "ensaio",
      ],
    },
  },
} as const
