import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database } from "@/integrations/supabase/types";

const departmentSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  sigla: z.string().min(2, "A sigla deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  cor: z.string().min(1, "Selecione uma cor"),
  icone: z.string().min(1, "Selecione um ícone"),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

type Departamento = Database["public"]["Tables"]["departamentos"]["Row"];

interface DepartmentFormProps {
  department?: Departamento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = [
  { label: "Azul", value: "from-blue-600 to-blue-400" },
  { label: "Rosa", value: "from-pink-600 to-pink-400" },
  { label: "Amarelo", value: "from-amber-500 to-yellow-400" },
  { label: "Roxo", value: "from-purple-600 to-purple-400" },
  { label: "Verde", value: "from-emerald-600 to-teal-400" },
  { label: "Vermelho", value: "from-rose-600 to-rose-400" },
  { label: "Índigo", value: "from-indigo-600 to-indigo-400" },
  { label: "Cinza", value: "from-slate-700 to-slate-500" },
];

const ICONS = [
  { label: "Usuários", value: "Users2" },
  { label: "Coração", value: "Heart" },
  { label: "Bebê", value: "Baby" },
  { label: "Globo", value: "Globe" },
  { label: "Ajuda", value: "HandHelping" },
  { label: "Livro", value: "BookOpen" },
  { label: "Formatura", value: "GraduationCap" },
  { label: "Brilho", value: "Sparkles" },
];

export function DepartmentForm({ department, open, onOpenChange }: DepartmentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!department;

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      nome: "",
      sigla: "",
      descricao: "",
      cor: "from-blue-600 to-blue-400",
      icone: "Users2",
    },
  });

  // Update form values when department changes or dialog opens
  if (open && isEditing && department && form.getValues("nome") === "" && department.nome !== "") {
    form.reset({
      nome: department.nome,
      sigla: department.sigla || "",
      descricao: department.descricao || "",
      cor: department.cor || "from-blue-600 to-blue-400",
      icone: department.icone || "Users2",
    });
  } else if (open && !isEditing && form.getValues("nome") !== "") {
    // This is a bit hacky, normally you'd use useEffect, 
    // but we need to reset when switching from edit to add
  }

  const mutation = useMutation({
    mutationFn: async (values: DepartmentFormValues) => {
      if (isEditing && department) {
        const { error } = await supabase
          .from("departamentos")
          .update({
            nome: values.nome,
            sigla: values.sigla,
            descricao: values.descricao,
            cor: values.cor,
            icone: values.icone,
          })
          .eq("id", department.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departamentos").insert({
          nome: values.nome,
          sigla: values.sigla,
          descricao: values.descricao,
          cor: values.cor,
          icone: values.icone,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departamentos"] });
      toast.success(isEditing ? "Departamento atualizado!" : "Departamento criado!");
      onOpenChange(false);
      form.reset({
        nome: "",
        sigla: "",
        descricao: "",
        cor: "from-blue-600 to-blue-400",
        icone: "Users2",
      });
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar departamento: " + error.message);
    },
  });


  function onSubmit(values: DepartmentFormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Departamento" : "Novo Departamento"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: União da Mocidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sigla"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sigla</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: UMADB" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Breve descrição do departamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma cor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`h-4 w-4 rounded bg-gradient-to-r ${color.value}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um ícone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ICONS.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
