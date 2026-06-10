import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, Cake, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DEPARTMENTS = ["UMADB", "UFADEB", "Alpha Kids", "CREIO", "Missoes", "Assistencia Social", "EBD", "Teologia FAESP"] as const;

export const Route = createFileRoute("/_authenticated/membros")({
  component: Membros;
});
