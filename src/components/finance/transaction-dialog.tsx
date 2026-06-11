import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as fns from "@/lib/finance.functions";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "entrada" | "saida";
  congregationId: string;
  isSede: boolean;
  initial?: any;
};

const formasPagamento = [
  { v: "dinheiro", l: "Dinheiro" },
  { v: "pix", l: "Pix" },
  { v: "cartao", l: "Cartão" },
  { v: "transferencia", l: "Transferência" },
  { v: "outros", l: "Outros" },
];

export function TransactionDialog({ open, onOpenChange, tipo, congregationId, isSede, initial }: Props) {
  const qc = useQueryClient();
  const listCategories = useServerFn(fns.listCategories);
  const listCongregations = useServerFn(fns.listCongregationsLite);
  const listMembers = useServerFn(fns.listMembersLite);
  const createTx = useServerFn(fns.createTransaction);
  const updateTx = useServerFn(fns.updateTransaction);

  const [form, setForm] = useState({
    id: initial?.id as string | undefined,
    congregation_id: initial?.congregation_id ?? congregationId,
    category_id: initial?.category_id ?? "",
    valor: initial?.valor ? String(initial.valor) : "",
    data: initial?.data ?? new Date().toISOString().slice(0, 10),
    forma_pagamento: initial?.forma_pagamento ?? "dinheiro",
    member_id: initial?.member_id ?? "",
    contribuinte_nome: initial?.contribuinte_nome ?? "",
    anonimo: initial?.anonimo ?? false,
    descricao: initial?.descricao ?? "",
    observacoes: initial?.observacoes ?? "",
  });

  useEffect(() => {
    if (open && initial) setForm((f) => ({ ...f, ...initial, valor: String(initial.valor ?? "") }));
  }, [open, initial]);

  const { data: categories = [] } = useQuery({
    queryKey: ["finance-cats", tipo],
    queryFn: () => listCategories({ data: { tipo } }),
  });

  const { data: congregations = [] } = useQuery({
    queryKey: ["finance-congs"],
    queryFn: () => listCongregations(),
    enabled: isSede,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["finance-members", form.congregation_id],
    queryFn: () => listMembers({ data: { congregation_id: form.congregation_id } }),
    enabled: !!form.congregation_id && tipo === "entrada",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        tipo,
        valor: Number(form.valor),
        member_id: form.member_id || null,
        contribuinte_nome: form.contribuinte_nome || null,
        descricao: form.descricao || null,
        observacoes: form.observacoes || null,
      };
      if (form.id) return updateTx({ data: payload as any });
      return createTx({ data: payload as any });
    },
    onSuccess: () => {
      toast.success(form.id ? "Lançamento atualizado" : "Lançamento registrado");
      qc.invalidateQueries({ queryKey: ["finance-transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar" : "Novo"} {tipo === "entrada" ? "Lançamento" : "Despesa"}</DialogTitle>
          <DialogDescription>Preencha os dados {tipo === "entrada" ? "da entrada" : "da despesa"}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          {isSede && (
            <div className="md:col-span-2">
              <Label>Congregação</Label>
              <Select value={form.congregation_id} onValueChange={(v) => setForm({ ...form, congregation_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {congregations.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.is_headquarters ? " (Sede)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {formasPagamento.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {tipo === "entrada" && (
            <>
              <div className="md:col-span-2 flex items-center gap-3">
                <Switch checked={form.anonimo} onCheckedChange={(v) => setForm({ ...form, anonimo: v, member_id: v ? "" : form.member_id, contribuinte_nome: v ? "" : form.contribuinte_nome })} />
                <Label>Contribuição anônima</Label>
              </div>
              {!form.anonimo && (
                <>
                  <div>
                    <Label>Membro (opcional)</Label>
                    <Select value={form.member_id || "none"} onValueChange={(v) => setForm({ ...form, member_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nenhum —</SelectItem>
                        {members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ou nome livre</Label>
                    <Input value={form.contribuinte_nome} onChange={(e) => setForm({ ...form, contribuinte_nome: e.target.value })} placeholder="Nome do contribuinte" />
                  </div>
                </>
              )}
            </>
          )}
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição" />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.category_id || !form.valor}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
