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
      finance_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          congregation_id: string | null
          created_at: string
          diff: Json | null
          id: string
          transaction_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          congregation_id?: string | null
          created_at?: string
          diff?: Json | null
          id?: string
          transaction_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          congregation_id?: string | null
          created_at?: string
          diff?: Json | null
          id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_audit_logs_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          ativo: boolean
          congregation_id: string | null
          cor: string | null
          created_at: string
          id: string
          nome: string
          slug: string
          tipo: Database["public"]["Enums"]["finance_tipo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          congregation_id?: string | null
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          slug: string
          tipo: Database["public"]["Enums"]["finance_tipo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          congregation_id?: string | null
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          slug?: string
          tipo?: Database["public"]["Enums"]["finance_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_closings: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          congregation_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          event_id: string | null
          id: string
          observacoes: string | null
          periodo_tipo: Database["public"]["Enums"]["finance_closing_periodo"]
          saldo: number
          status: Database["public"]["Enums"]["finance_closing_status"]
          total_entradas: number
          total_saidas: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          congregation_id: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          event_id?: string | null
          id?: string
          observacoes?: string | null
          periodo_tipo: Database["public"]["Enums"]["finance_closing_periodo"]
          saldo?: number
          status?: Database["public"]["Enums"]["finance_closing_status"]
          total_entradas?: number
          total_saidas?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          congregation_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          event_id?: string | null
          id?: string
          observacoes?: string | null
          periodo_tipo?: Database["public"]["Enums"]["finance_closing_periodo"]
          saldo?: number
          status?: Database["public"]["Enums"]["finance_closing_status"]
          total_entradas?: number
          total_saidas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_closings_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_closings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          anonimo: boolean
          approved_at: string | null
          approved_by: string | null
          category_id: string
          comprovante_url: string | null
          congregation_id: string
          contribuinte_nome: string | null
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          event_id: string | null
          forma_pagamento: Database["public"]["Enums"]["finance_forma_pagamento"]
          id: string
          member_id: string | null
          observacoes: string | null
          rejected_reason: string | null
          status: Database["public"]["Enums"]["finance_status"]
          tipo: Database["public"]["Enums"]["finance_tipo"]
          updated_at: string
          valor: number
        }
        Insert: {
          anonimo?: boolean
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          comprovante_url?: string | null
          congregation_id: string
          contribuinte_nome?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          event_id?: string | null
          forma_pagamento?: Database["public"]["Enums"]["finance_forma_pagamento"]
          id?: string
          member_id?: string | null
          observacoes?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["finance_status"]
          tipo: Database["public"]["Enums"]["finance_tipo"]
          updated_at?: string
          valor: number
        }
        Update: {
          anonimo?: boolean
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          comprovante_url?: string | null
          congregation_id?: string
          contribuinte_nome?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          event_id?: string | null
          forma_pagamento?: Database["public"]["Enums"]["finance_forma_pagamento"]
          id?: string
          member_id?: string | null
          observacoes?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["finance_status"]
          tipo?: Database["public"]["Enums"]["finance_tipo"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_amiga_avisos: {
        Row: {
          campanha_id: string | null
          congregation_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          mensagem: string
          titulo: string
          urgente: boolean | null
        }
        Insert: {
          campanha_id?: string | null
          congregation_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mensagem: string
          titulo: string
          urgente?: boolean | null
        }
        Update: {
          campanha_id?: string | null
          congregation_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mensagem?: string
          titulo?: string
          urgente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mao_amiga_avisos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mao_amiga_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_amiga_avisos_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_amiga_campanhas: {
        Row: {
          congregation_id: string
          created_at: string | null
          descricao: string | null
          ends_at: string | null
          id: string
          meta: string | null
          starts_at: string | null
          status: string
          tipo: string
          titulo: string
        }
        Insert: {
          congregation_id: string
          created_at?: string | null
          descricao?: string | null
          ends_at?: string | null
          id?: string
          meta?: string | null
          starts_at?: string | null
          status?: string
          tipo: string
          titulo: string
        }
        Update: {
          congregation_id?: string
          created_at?: string | null
          descricao?: string | null
          ends_at?: string | null
          id?: string
          meta?: string | null
          starts_at?: string | null
          status?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mao_amiga_campanhas_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_amiga_categorias: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      mao_amiga_doacoes: {
        Row: {
          categoria_id: string
          congregation_id: string
          created_at: string | null
          created_by: string | null
          data_doacao: string
          descricao: string
          doador_id: string
          id: string
          observacoes: string | null
          quantidade: number
          unidade: string
          valor_dinheiro: number | null
        }
        Insert: {
          categoria_id: string
          congregation_id: string
          created_at?: string | null
          created_by?: string | null
          data_doacao?: string
          descricao: string
          doador_id: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          valor_dinheiro?: number | null
        }
        Update: {
          categoria_id?: string
          congregation_id?: string
          created_at?: string | null
          created_by?: string | null
          data_doacao?: string
          descricao?: string
          doador_id?: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          valor_dinheiro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mao_amiga_doacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "mao_amiga_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_amiga_doacoes_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_amiga_doacoes_doador_id_fkey"
            columns: ["doador_id"]
            isOneToOne: false
            referencedRelation: "mao_amiga_doadores"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_amiga_doadores: {
        Row: {
          congregation_id: string
          created_at: string | null
          email: string | null
          id: string
          member_id: string | null
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          congregation_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          member_id?: string | null
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          congregation_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          member_id?: string | null
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mao_amiga_doadores_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_amiga_doadores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_amiga_entregas: {
        Row: {
          categoria_id: string
          congregation_id: string
          created_at: string | null
          data_entrega: string
          descricao: string
          familia_id: string
          id: string
          observacoes: string | null
          quantidade: number
          responsavel_id: string | null
        }
        Insert: {
          categoria_id: string
          congregation_id: string
          created_at?: string | null
          data_entrega?: string
          descricao: string
          familia_id: string
          id?: string
          observacoes?: string | null
          quantidade: number
          responsavel_id?: string | null
        }
        Update: {
          categoria_id?: string
          congregation_id?: string
          created_at?: string | null
          data_entrega?: string
          descricao?: string
          familia_id?: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          responsavel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mao_amiga_entregas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "mao_amiga_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_amiga_entregas_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_amiga_entregas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "mao_amiga_familias"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_amiga_estoque: {
        Row: {
          categoria_id: string
          congregation_id: string
          descricao: string
          id: string
          quantidade: number
          unidade: string
          updated_at: string | null
        }
        Insert: {
          categoria_id: string
          congregation_id: string
          descricao: string
          id?: string
          quantidade?: number
          unidade: string
          updated_at?: string | null
        }
        Update: {
          categoria_id?: string
          congregation_id?: string
          descricao?: string
          id?: string
          quantidade?: number
          unidade?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mao_amiga_estoque_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "mao_amiga_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_amiga_estoque_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_amiga_estoque_movimentos: {
        Row: {
          categoria_id: string
          congregation_id: string
          created_at: string | null
          created_by: string | null
          descricao: string
          id: string
          quantidade: number
          referencia_id: string | null
          tipo: string
        }
        Insert: {
          categoria_id: string
          congregation_id: string
          created_at?: string | null
          created_by?: string | null
          descricao: string
          id?: string
          quantidade: number
          referencia_id?: string | null
          tipo: string
        }
        Update: {
          categoria_id?: string
          congregation_id?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string
          id?: string
          quantidade?: number
          referencia_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mao_amiga_estoque_movimentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "mao_amiga_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_amiga_estoque_movimentos_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_amiga_familias: {
        Row: {
          ativo: boolean | null
          congregation_id: string
          created_at: string | null
          endereco: string | null
          id: string
          necessidade_principal: string | null
          nome_responsavel: string
          observacoes: string | null
          qtd_pessoas: number | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          congregation_id: string
          created_at?: string | null
          endereco?: string | null
          id?: string
          necessidade_principal?: string | null
          nome_responsavel: string
          observacoes?: string | null
          qtd_pessoas?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          congregation_id?: string
          created_at?: string | null
          endereco?: string | null
          id?: string
          necessidade_principal?: string | null
          nome_responsavel?: string
          observacoes?: string | null
          qtd_pessoas?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mao_amiga_familias_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_departments: {
        Row: {
          created_at: string
          departamento_id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          departamento_id: string
          member_id: string
        }
        Update: {
          created_at?: string
          departamento_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_departments_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_departments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_skills: {
        Row: {
          contact_visible: boolean
          created_at: string
          description: string | null
          id: string
          member_id: string
          name: string
          updated_at: string
        }
        Insert: {
          contact_visible?: boolean
          created_at?: string
          description?: string | null
          id?: string
          member_id: string
          name: string
          updated_at?: string
        }
        Update: {
          contact_visible?: boolean
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_skills_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
          active: boolean
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
          active?: boolean
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
          active?: boolean
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
      can_approve_finance: {
        Args: { _congregation_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_finance: {
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
      is_finance_period_locked: {
        Args: { _congregation_id: string; _data: string }
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
        | "tesoureiro"
        | "secretario"
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
      finance_closing_periodo: "culto" | "semana" | "mes"
      finance_closing_status: "aberto" | "fechado"
      finance_forma_pagamento:
        | "dinheiro"
        | "pix"
        | "cartao"
        | "transferencia"
        | "outros"
      finance_status: "pendente" | "aprovado" | "rejeitado"
      finance_tipo: "entrada" | "saida"
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
        "tesoureiro",
        "secretario",
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
      finance_closing_periodo: ["culto", "semana", "mes"],
      finance_closing_status: ["aberto", "fechado"],
      finance_forma_pagamento: [
        "dinheiro",
        "pix",
        "cartao",
        "transferencia",
        "outros",
      ],
      finance_status: ["pendente", "aprovado", "rejeitado"],
      finance_tipo: ["entrada", "saida"],
    },
  },
} as const
