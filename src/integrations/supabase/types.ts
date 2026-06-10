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
      ebd_attendance_records: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          justification: string | null
          present: boolean
          session_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          justification?: string | null
          present?: boolean
          session_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          justification?: string | null
          present?: boolean
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebd_attendance_records_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "ebd_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebd_attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ebd_attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ebd_attendance_sessions: {
        Row: {
          class_id: string
          created_at: string
          id: string
          lesson_date: string
          lesson_title: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          lesson_date?: string
          lesson_title?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          lesson_date?: string
          lesson_title?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ebd_attendance_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "ebd_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebd_attendance_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ebd_classes: {
        Row: {
          active: boolean
          assistant_id: string | null
          category: Database["public"]["Enums"]["ebd_category"]
          congregation_id: string
          created_at: string
          id: string
          name: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          assistant_id?: string | null
          category: Database["public"]["Enums"]["ebd_category"]
          congregation_id: string
          created_at?: string
          id?: string
          name: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          assistant_id?: string | null
          category?: Database["public"]["Enums"]["ebd_category"]
          congregation_id?: string
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebd_classes_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebd_classes_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebd_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ebd_enrollments: {
        Row: {
          address: string | null
          birth_date: string | null
          class_id: string
          congregation_id: string
          created_at: string
          full_name: string
          guardian_name: string | null
          id: string
          member_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["ebd_student_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          class_id: string
          congregation_id: string
          created_at?: string
          full_name: string
          guardian_name?: string | null
          id?: string
          member_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["ebd_student_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          class_id?: string
          congregation_id?: string
          created_at?: string
          full_name?: string
          guardian_name?: string | null
          id?: string
          member_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["ebd_student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebd_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "ebd_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebd_enrollments_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebd_enrollments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
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
      event_schedules: {
        Row: {
          congregation_id: string | null
          created_at: string | null
          event_id: string | null
          id: string
          notes: string | null
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          congregation_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_schedules_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
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
      ministry_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      schedule_assignments: {
        Row: {
          approved_at: string | null
          approver_user_id: string | null
          created_at: string | null
          id: string
          is_cross_congregation: boolean | null
          rejection_reason: string | null
          requesting_congregation_id: string | null
          role_id: string | null
          schedule_id: string | null
          status: string | null
          volunteer_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_user_id?: string | null
          created_at?: string | null
          id?: string
          is_cross_congregation?: boolean | null
          rejection_reason?: string | null
          requesting_congregation_id?: string | null
          role_id?: string | null
          schedule_id?: string | null
          status?: string | null
          volunteer_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_user_id?: string | null
          created_at?: string | null
          id?: string
          is_cross_congregation?: boolean | null
          rejection_reason?: string | null
          requesting_congregation_id?: string | null
          role_id?: string | null
          schedule_id?: string | null
          status?: string | null
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_requesting_congregation_id_fkey"
            columns: ["requesting_congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "ministry_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "event_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          actor_user_name: string | null
          changes: Json
          congregation_id: string | null
          created_at: string
          id: string
          target_user_email: string | null
          target_user_id: string | null
          target_user_name: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          actor_user_name?: string | null
          changes?: Json
          congregation_id?: string | null
          created_at?: string
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          actor_user_name?: string | null
          changes?: Json
          congregation_id?: string | null
          created_at?: string
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_audit_logs_congregation_id_fkey"
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
      volunteer_roles: {
        Row: {
          role_id: string
          volunteer_id: string
        }
        Insert: {
          role_id: string
          volunteer_id: string
        }
        Update: {
          role_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "ministry_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_roles_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          availability: string | null
          congregation_id: string | null
          created_at: string | null
          id: string
          member_id: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          availability?: string | null
          congregation_id?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          availability?: string | null
          congregation_id?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
      check_volunteer_conflict: {
        Args: { _event_id: string; _volunteer_id: string }
        Returns: {
          ends_at: string
          event_id: string
          starts_at: string
          title: string
        }[]
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
      ebd_category: "Adultos" | "Crianças" | "Jovens" | "Homens" | "Mulheres"
      ebd_student_status: "ativo" | "visitante" | "transferido" | "inativo"
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
      ebd_category: ["Adultos", "Crianças", "Jovens", "Homens", "Mulheres"],
      ebd_student_status: ["ativo", "visitante", "transferido", "inativo"],
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
