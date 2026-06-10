import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMinistryRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ministry_roles")
      .select("*")
      .order("name");
    if (error) throw error;
    return data;
  });

export const getVolunteers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ congregationId: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("volunteers")
      .select("*, ministry_roles(*), congregations(name)");
    
    if (data.congregationId) {
      query = query.eq("congregation_id", data.congregationId);
    }
    
    const { data: volunteers, error } = await query.order("name");
    if (error) throw error;
    return volunteers;
  });

export const upsertVolunteer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().optional(),
    name: z.string(),
    phone: z.string().optional(),
    congregation_id: z.string(),
    member_id: z.string().optional(),
    availability: z.string().optional(),
    notes: z.string().optional(),
    role_ids: z.array(z.string())
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { role_ids, ...volunteerData } = data;
    
    const { data: volunteer, error } = await context.supabase
      .from("volunteers")
      .upsert(volunteerData)
      .select()
      .single();
      
    if (error) throw error;

    // Update roles
    await context.supabase.from("volunteer_roles").delete().eq("volunteer_id", volunteer.id);
    if (role_ids.length > 0) {
      const roleInserts = role_ids.map(roleId => ({
        volunteer_id: volunteer.id,
        role_id: roleId
      }));
      const { error: roleError } = await context.supabase.from("volunteer_roles").insert(roleInserts);
      if (roleError) throw roleError;
    }

    return volunteer;
  });

export const getEventSchedules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ congregationId: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("event_schedules")
      .select("*, events(*), congregations(name), schedule_assignments(*, volunteers(*), ministry_roles(*))");
    
    if (data.congregationId) {
      query = query.eq("congregation_id", data.congregationId);
    }
    
    const { data: schedules, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return schedules;
  });

export const createSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    event_id: z.string(),
    congregation_id: z.string(),
    notes: z.string().optional()
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: schedule, error } = await context.supabase
      .from("event_schedules")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return schedule;
  });

export const assignVolunteer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    schedule_id: z.string(),
    volunteer_id: z.string(),
    role_id: z.string(),
    is_cross_congregation: z.boolean().optional(),
    requesting_congregation_id: z.string().optional()
  }).parse(d))
  .handler(async ({ data, context }) => {
    // Check for conflicts
    const { data: scheduleInfo } = await context.supabase
      .from("event_schedules")
      .select("event_id")
      .eq("id", data.schedule_id)
      .single();

    const eventId = scheduleInfo?.event_id;
    if (eventId) {
      const { data: conflicts } = await context.supabase.rpc("check_volunteer_conflict", {
        _volunteer_id: data.volunteer_id,
        _event_id: eventId
      });
      
      if (conflicts && conflicts.length > 0) {
        throw new Error(`Conflito: Este voluntário já está escalado no evento "${conflicts[0].title}" no mesmo horário.`);
      }
    }

    const assignmentData = {
      ...data,
      status: data.is_cross_congregation ? "pendente" as const : "aprovado" as const
    };

    const { data: assignment, error } = await context.supabase
      .from("schedule_assignments")
      .insert(assignmentData)
      .select()
      .single();
      
    if (error) throw error;

    // Create notification if cross-congregation
    if (data.is_cross_congregation) {
        const { data: volunteer } = await context.supabase.from("volunteers").select("name, congregation_id").eq("id", data.volunteer_id).single();
        const volCongId = volunteer?.congregation_id;
        if (volunteer && volCongId) {
            // Notify pastors of the volunteer's congregation
            const { data: roles } = await context.supabase.from("user_roles").select("user_id").eq("role", "admin_congregacao").eq("congregation_id", volCongId);
            
            if (roles) {
                for (const r of roles) {
                    await context.supabase.from("schedule_notifications").insert({
                        user_id: r.user_id,
                        title: "Nova solicitação de escala",
                        message: `A congregação solicitou o voluntário ${volunteer.name} para um evento.`,
                        link: "/app/escalas?tab=approvals"
                    });
                }
            }
        }
    }

    return assignment;
  });

export const updateAssignmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string(),
    status: z.enum(["aprovado", "recusado", "concluido"]),
    rejection_reason: z.string().optional()
  }).parse(d))
  .handler(async ({ data, context }) => {
    const updateData: any = { status: data.status };
    if (data.status === "aprovado") {
        updateData.approved_at = new Date().toISOString();
        updateData.approver_user_id = context.userId;
    }
    if (data.rejection_reason) updateData.rejection_reason = data.rejection_reason;

    const { data: assignment, error } = await context.supabase
      .from("schedule_assignments")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();
      
    if (error) throw error;
    return assignment;
  });

export const getPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("congregation_id").eq("id", context.userId).single();
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const isSedeAdmin = (roleRows ?? []).some((r: any) => r.role === "admin_sede");

    let query = context.supabase
      .from("schedule_assignments")
      .select("*, volunteers!inner(*), ministry_roles(*), event_schedules(events(*), congregations(name))")
      .eq("status", "pendente")
      .eq("is_cross_congregation", true);
    
    if (!isSedeAdmin && profile?.congregation_id) {
        query = query.eq("volunteers.congregation_id", profile.congregation_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });
