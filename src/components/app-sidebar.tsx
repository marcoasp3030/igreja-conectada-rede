import { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Church, Calendar, CalendarDays, Megaphone, BookOpen,
  MapPin, Building2, Settings, LogOut, Users2, UserCog, ScrollText, HeartHandshake, Wallet,
  ChevronRight, ChevronDown
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const groups: MenuGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Painel", url: "/app", icon: LayoutDashboard },
    ],
  },
  {
    label: "Igreja",
    items: [
      { title: "Congregações", url: "/app/congregacoes", icon: Church },
      { title: "Membros", url: "/app/membros", icon: Users },
      { title: "Mapa", url: "/app/mapa", icon: MapPin },
      { title: "Departamentos", url: "/app/departamentos", icon: Building2 },
    ],
  },
  {
    label: "Programação",
    items: [
      { title: "Calendário", url: "/app/calendario", icon: CalendarDays },
      { title: "Agenda", url: "/app/agenda", icon: Calendar },
      { title: "Escalas", url: "/app/escalas", icon: Users2 },
      { title: "EBD", url: "/app/ebd", icon: BookOpen },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { title: "Avisos", url: "/app/avisos", icon: Megaphone },
      { title: "Mão Amiga", url: "/app/mao-amiga", icon: HeartHandshake },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Financeiro", url: "/app/financeiro", icon: Wallet },
      { title: "Usuários", url: "/app/usuarios", icon: UserCog },
      { title: "Auditoria", url: "/app/auditoria", icon: ScrollText },
    ],
  },
];

function useOpenGroups() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("sidebar-groups");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("sidebar-groups", JSON.stringify(openGroups));
  }, [openGroups]);

  return { openGroups, setOpenGroups };
}

function MenuItemLink({ item, active }: { item: MenuItem; active: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const link = (
    <SidebarMenuButton asChild isActive={active} tooltip={collapsed ? item.title : undefined}>
      <Link to={item.url} className="flex items-center gap-2">
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.title}</span>
      </Link>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem>
      {link}
    </SidebarMenuItem>
  );
}

function GroupSection({ group, open, onOpenChange, collapsed }: {
  group: MenuGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed: boolean;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const hasActive = group.items.some(
    (item) => path === item.url || (item.url !== "/app" && path.startsWith(item.url))
  );

  if (collapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) => {
              const active = path === item.url || (item.url !== "/app" && path.startsWith(item.url));
              return (
                <SidebarMenuItem key={item.url}>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 shrink-0" />
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-3">
                      {item.title}
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (group.items.length === 1) {
    const item = group.items[0];
    const active = path === item.url || (item.url !== "/app" && path.startsWith(item.url));
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <MenuItemLink item={item} active={active} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={open || hasActive} onOpenChange={onOpenChange} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center justify-between pr-2 text-[11px] uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground/90">
            <span>{group.label}</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = path === item.url || (item.url !== "/app" && path.startsWith(item.url));
                return (
                  <MenuItemLink key={item.url} item={item} active={active} />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { openGroups, setOpenGroups } = useOpenGroups();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" className="transition-[width] duration-300 ease-in-out">
        <SidebarHeader className="border-b border-sidebar-border/60">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="rounded-lg bg-white/10 p-1.5 transition-transform duration-300 hover:scale-105">
              <BrandLogo className="h-9 w-9" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight animate-fade-in">
                <span className="text-sm font-semibold text-sidebar-foreground">AD Setor 70</span>
                <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70">
                  Ministério do Belém
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="overflow-y-auto">
          {groups.map((group) => (
            <GroupSection
              key={group.label}
              group={group}
              open={!!openGroups[group.label]}
              onOpenChange={(o) => setOpenGroups((prev) => ({ ...prev, [group.label]: o }))}
              collapsed={collapsed}
            />
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/60">
          {collapsed ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <Link to="/app/configuracoes" className="flex items-center gap-2">
                        <Settings className="h-4 w-4 shrink-0" />
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">Configurações</TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton onClick={handleLogout}>
                      <LogOut className="h-4 w-4 shrink-0" />
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sair</TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : (
            <>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/app/configuracoes" className="flex items-center gap-2">
                      <Settings className="h-4 w-4 shrink-0" />
                      <span>Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="mt-1 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut className="mr-2 h-4 w-4 shrink-0" /> Sair
              </Button>
            </>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
