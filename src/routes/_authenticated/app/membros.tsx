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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Cake, Building2, X, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DEPARTMENTS = ["UMADB", "UFADEB", "Alpha Kids", "CREIO", "Missoes", "Assistencia Social", "EBD", "Teologia FAESP"] as const;
type DeptType = (typeof DEPARTMENTS)[number];

export const Route = createFileRoute("/_authenticated/app/membros")({
  component: Membros,
});

function Membros() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCong, setFilterCong] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");

  const empty = {
    full_name: "", phone: "", email: "", birth_date: "", position: "",
    department: "" as DeptType | "", congregation_id: "",
    address: "", address_number: "", neighborhood: "", city: "", state: "SP", zip_code: "",
  };
  const [form, setForm] = useState(empty);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  type SkillForm = { name: string; description: string };
  const [skills, setSkills] = useState<SkillForm[]>([]);

  const { data: congregations } = useQuery({
    queryKey: ["congregations-list"],
    queryFn: async () => (await supabase.from("congregations").select("id, name").order("name")).data ?? [],
  });

  const { data: departamentos } = useQuery({
    queryKey: ["departamentos-list"],
    queryFn: async () => (await supabase.from("departamentos").select("id, nome, sigla").order("nome")).data ?? [],
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*, congregations(name)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    return (members ?? []).filter((m) => {
      if (filterCong !== "all" && m.congregation_id !== filterCong) return false;
      if (filterDept !== "all" && m.department !== filterDept) return false;
      if (search && !m.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [members, search, filterCong, filterDept]);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.congregation_id) throw new Error("Selecione a congregação");
      const { data: inserted, error } = await supabase.from("members").insert({
        full_name: form.full_name,
        phone: form.phone || null,
        email: form.email || null,
        birth_date: form.birth_date || null,
        position: form.position || null,
        department: form.department || null,
        congregation_id: form.congregation_id,
        address: form.address || null,
        address_number: form.address_number || null,
        neighborhood: form.neighborhood || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
      }).select("id").single();
      if (error) throw error;
      const memberId = inserted!.id;

      if (selectedDeptIds.length) {
        const { error: dErr } = await supabase.from("member_departments").insert(
          selectedDeptIds.map((id) => ({ member_id: memberId, departamento_id: id }))
        );
        if (dErr) throw dErr;
      }

      const cleanSkills = skills
        .map((s) => ({ name: s.name.trim(), description: s.description.trim() }))
        .filter((s) => s.name.length > 0);
      if (cleanSkills.length) {
        const { error: sErr } = await supabase.from("member_skills").insert(
          cleanSkills.map((s) => ({
            member_id: memberId,
            name: s.name.slice(0, 100),
            description: s.description ? s.description.slice(0, 500) : null,
          }))
        );
        if (sErr) throw sErr;
      }
    },
    onSuccess: () => {
      toast.success("Membro cadastrado!");
      qc.invalidateQueries({ queryKey: ["members"] });
      setOpen(false);
      setForm(empty);
      setSelectedDeptIds([]);
      setSkills([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDept = (id: string) =>
    setSelectedDeptIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const addSkill = () => setSkills((prev) => [...prev, { name: "", description: "" }]);
  const updateSkill = (i: number, patch: Partial<SkillForm>) =>
    setSkills((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const removeSkill = (i: number) => setSkills((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div>
      <PageHeader
        title="Membros"
        description="Cadastro e gestão dos membros do Setor 70."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo membro</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader><DialogTitle>Novo membro</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2"><Label>Nome completo *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Data de nascimento</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cargo</Label>
                  <Input placeholder="Membro, Diácono, Presbítero..." value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
                <div className="space-y-2"><Label>Departamento</Label>
                  <Select value={form.department || undefined} onValueChange={(v) => setForm({ ...form, department: v as DeptType })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Congregação *</Label>
                  <Select value={form.congregation_id || undefined} onValueChange={(v) => setForm({ ...form, congregation_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {congregations?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2"><Label>Endereço</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Número</Label>
                  <Input value={form.address_number} onChange={(e) => setForm({ ...form, address_number: e.target.value })} /></div>
                <div className="space-y-2"><Label>Bairro</Label>
                  <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cidade</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>UF</Label>
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>CEP</Label>
                  <Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} /></div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Departamentos (pode selecionar mais de um)</Label>
                  <div className="rounded-md border p-3 max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(departamentos ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-2">
                        Nenhum departamento cadastrado. Crie em "Departamentos".
                      </p>
                    )}
                    {departamentos?.map((d) => {
                      const checked = selectedDeptIds.includes(d.id);
                      return (
                        <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={checked} onCheckedChange={() => toggleDept(d.id)} />
                          <span>{d.nome}{d.sigla ? ` (${d.sigla})` : ""}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Habilidades / Profissões
                    </Label>
                    <Button type="button" size="sm" variant="outline" onClick={addSkill}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ex.: Eletricista, Costureira, Médico. Outros membros poderão consultar e contratar serviços.
                  </p>
                  {skills.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhuma habilidade adicionada.</p>
                  )}
                  <div className="space-y-2">
                    {skills.map((s, i) => (
                      <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_2fr_auto]">
                        <Input
                          placeholder="Habilidade"
                          maxLength={100}
                          value={s.name}
                          onChange={(e) => updateSkill(i, { name: e.target.value })}
                        />
                        <Textarea
                          placeholder="Descrição / observações (opcional)"
                          maxLength={500}
                          rows={1}
                          value={s.description}
                          onChange={(e) => updateSkill(i, { description: e.target.value })}
                        />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeSkill(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending || !form.full_name}>
                  {create.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="mb-4 shadow-card">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Nome do membro" />
            </div>
          </div>
          <div className="w-44">
            <Label className="text-xs">Congregação</Label>
            <Select value={filterCong} onValueChange={setFilterCong}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {congregations?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label className="text-xs">Departamento</Label>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading && <div className="p-6 text-sm text-muted-foreground">Carregando...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</div>
          )}
          <div className="divide-y">
            {filtered.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-hero text-sm font-semibold text-primary-foreground">
                  {m.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.position || "Membro"}</p>
                </div>
                <div className="hidden text-xs text-muted-foreground sm:flex sm:items-center sm:gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {(m as { congregations?: { name?: string } }).congregations?.name ?? "—"}
                </div>
                {m.department && (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                    {m.department}
                  </span>
                )}
                {m.phone && (
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                    <Phone className="h-3.5 w-3.5" /> {m.phone}
                  </span>
                )}
                {m.birth_date && (
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
                    <Cake className="h-3.5 w-3.5" /> {format(new Date(m.birth_date), "dd/MM")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
