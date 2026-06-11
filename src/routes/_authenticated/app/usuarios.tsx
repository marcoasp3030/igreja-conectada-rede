import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, KeyRound, Trash2, Pencil, Search, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import * as fns from "@/lib/users.functions";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_authenticated/app/usuarios")({
  component: Usuarios,
});

const ROLE_LABEL: Record<string, string> = {
  admin_sede: "Admin Sede",
  admin_congregacao: "Pastor Local",
  lider_departamento: "Líder Depto.",
  membro: "Membro",
};

type FormState = {
  id?: string;
  email: string;
  password: string;
  full_name: string;
  phone: string;
  congregation_id: string;
  role: "admin_sede" | "admin_congregacao" | "lider_departamento" | "membro";
};

const emptyForm: FormState = {
  email: "", password: "", full_name: "", phone: "", congregation_id: "", role: "membro",
};

function Usuarios() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: me } = useProfile(user?.id);
  const isSede = !!me?.isSedeAdmin;

  const listUsers = useServerFn(fns.listUsers);
  const listCongs = useServerFn(fns.listCongregationsLite);
  const createUser = useServerFn(fns.createUser);
  const updateUser = useServerFn(fns.updateUser);
  const resetPwd = useServerFn(fns.resetUserPassword);
  const removeUser = useServerFn(fns.deleteUser);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pwdDialog, setPwdDialog] = useState<{ id: string; name: string } | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
  });
  const { data: congs = [] } = useQuery({
    queryKey: ["admin-congs"],
    queryFn: () => listCongs(),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (form.id) {
        return updateUser({ data: {
          user_id: form.id,
          full_name: form.full_name,
          phone: form.phone || null,
          congregation_id: form.congregation_id || null,
          role: form.role,
        }});
      }
      return createUser({ data: {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || undefined,
        congregation_id: form.congregation_id || null,
        role: form.role,
      }});
    },
    onSuccess: () => {
      toast.success(form.id ? "Usuário atualizado" : "Usuário criado");
      setDialogOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const reset = useMutation({
    mutationFn: () => resetPwd({ data: { user_id: pwdDialog!.id, password: newPwd } }),
    onSuccess: () => {
      toast.success("Senha redefinida");
      setPwdDialog(null);
      setNewPwd("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeUser({ data: { user_id: id } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const filtered = (users as any[]).filter((u) => {
    const t = search.toLowerCase();
    return !t || u.full_name?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t);
  });

  const openCreate = () => {
    setForm({
      ...emptyForm,
      congregation_id: isSede ? "" : (me?.profile?.congregation_id ?? ""),
    });
    setDialogOpen(true);
  };

  const openEdit = (u: any) => {
    setForm({
      id: u.id,
      email: u.email ?? "",
      password: "",
      full_name: u.full_name ?? "",
      phone: u.phone ?? "",
      congregation_id: u.congregation_id ?? "",
      role: u.roles?.[0] ?? "membro",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários & Perfis"
        description="Crie usuários e atribua perfis de acesso por congregação."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className="pl-8"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Congregação</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.congregations?.name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? []).map((r: string) => (
                          <Badge key={r} variant="secondary">{ROLE_LABEL[r] ?? r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setPwdDialog({ id: u.id, name: u.full_name })}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Excluir ${u.full_name}? Esta ação não pode ser desfeita.`)) del.mutate(u.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {form.id ? "Atualize dados, congregação ou perfil." : "Crie o acesso e atribua o perfil."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            {!form.id && (
              <>
                <div className="grid gap-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Senha inicial (mín. 8)</Label>
                  <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </>
            )}
            <div className="grid gap-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Congregação</Label>
              <Select
                value={form.congregation_id}
                onValueChange={(v) => setForm({ ...form, congregation_id: v })}
                disabled={!isSede}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(congs as any[]).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isSede && <SelectItem value="admin_sede">Admin Sede</SelectItem>}
                  <SelectItem value="admin_congregacao">Pastor Local</SelectItem>
                  <SelectItem value="lider_departamento">Líder de Departamento</SelectItem>
                  <SelectItem value="membro">Membro / Voluntário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!pwdDialog} onOpenChange={(o) => !o && setPwdDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>Definir nova senha para {pwdDialog?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Nova senha (mín. 8)</Label>
            <Input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialog(null)}>Cancelar</Button>
            <Button onClick={() => reset.mutate()} disabled={reset.isPending || newPwd.length < 8}>
              Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
