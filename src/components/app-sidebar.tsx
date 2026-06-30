import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Church, Calendar, CalendarDays, Megaphone, BookOpen,
  MapPin, Building2, Settings, LogOut, Users2, UserCog, ScrollText, HeartHandshake, Wallet,
  Sparkles, Search, X, Briefcase,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
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
      { title: "Empresarial", url: "/app/empresarial", icon: Briefcase },
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


function isItemActive(path: string, url: string) {
  return path === url || (url !== "/app" && path.startsWith(url));
}

function ItemRow({ item, active, collapsed }: { item: MenuItem; active: boolean; collapsed: boolean }) {
  const content = (
    <SidebarMenuButton
      asChild
      isActive={active}
      tooltip={collapsed ? item.title : undefined}
      className={cn(
        "group/item relative h-9 overflow-hidden rounded-lg transition-all duration-200",
        "hover:bg-sidebar-accent/70 hover:translate-x-0.5",
        active && [
          "bg-gradient-to-r from-sidebar-accent to-sidebar-accent/40",
          "text-sidebar-foreground shadow-sm",
        ],
      )}
    >
      <Link to={item.url} className="flex items-center gap-3">
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold shadow-[0_0_8px_var(--color-gold)]"
          />
        )}
        <item.icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-all duration-200",
            active ? "text-gold" : "text-sidebar-foreground/70 group-hover/item:text-sidebar-foreground",
          )}
        />
        <span
          className={cn(
            "truncate text-sm transition-all",
            active ? "font-medium text-sidebar-foreground" : "text-sidebar-foreground/85",
          )}
        >
          {item.title}
        </span>
      </Link>
    </SidebarMenuButton>
  );

  return <SidebarMenuItem>{content}</SidebarMenuItem>;
}

function GroupSection({ group, collapsed }: {
  group: MenuGroup;
  collapsed: boolean;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const hasActive = group.items.some((item) => isItemActive(path, item.url));

  if (collapsed) {
    return (
      <SidebarGroup className="py-1">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {group.items.map((item) => {
              const active = isItemActive(path, item.url);
              return (
                <SidebarMenuItem key={item.url}>
                  <Tooltip delayDuration={80}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          "relative h-9 w-9 rounded-lg transition-all duration-200",
                          "hover:bg-sidebar-accent hover:scale-105",
                          active && "bg-sidebar-accent shadow-[inset_0_0_0_1px_var(--color-gold)]",
                        )}
                      >
                        <Link to={item.url} className="flex items-center justify-center">
                          <item.icon
                            className={cn(
                              "h-[18px] w-[18px] transition-colors",
                              active ? "text-gold" : "text-sidebar-foreground/75",
                            )}
                          />
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10} className="flex items-center gap-2 font-medium">
                      {item.title}
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />}
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
    const active = isItemActive(path, item.url);
    return (
      <SidebarGroup className="py-1">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            <ItemRow item={item} active={active} collapsed={false} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5",
          "text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/55",
        )}
      >
        {group.label}
        {hasActive && <span className="h-1 w-1 rounded-full bg-gold" />}
      </SidebarGroupLabel>
      <SidebarGroupContent className="pt-1">
        <SidebarMenu className="gap-1">
          {group.items.map((item) => {
            const active = isItemActive(path, item.url);
            return <ItemRow key={item.url} item={item} active={active} collapsed={false} />;
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  

  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.title.toLowerCase().includes(term)),
      }))
      .filter((g) => g.items.length > 0);
  }, [search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !collapsed) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && search) {
        setSearch("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [search, collapsed]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar
        collapsible="icon"
        className={cn(
          "transition-[width] duration-300 ease-in-out",
          "[&_[data-sidebar=sidebar]]:bg-gradient-to-b",
          "[&_[data-sidebar=sidebar]]:from-sidebar",
          "[&_[data-sidebar=sidebar]]:to-[color-mix(in_oklab,var(--color-sidebar)_88%,black)]",
        )}
      >
        {/* Decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,var(--color-gold)_0%,transparent_70%)] opacity-[0.07]"
        />

        <SidebarHeader className="relative border-b border-sidebar-border/40">
          <div className="flex items-center gap-3 px-2 py-3">
            <div
              className={cn(
                "relative rounded-xl p-1.5 transition-all duration-300",
                "bg-gradient-to-br from-white/15 to-white/5",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
                "hover:scale-105 hover:shadow-[0_0_20px_-4px_var(--color-gold)]",
              )}
            >
              <BrandLogo className="h-9 w-9" />
              <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-gold opacity-80" />
            </div>
            {!collapsed && (
              <div className="flex min-w-0 flex-col leading-tight animate-fade-in">
                <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                  AD Setor 70
                </span>
                <span className="truncate text-[10px] uppercase tracking-[0.14em] text-gold/80">
                  Ministério do Belém
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="relative overflow-y-auto px-1 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-border/50">
          {!collapsed && (
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/50" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  className={cn(
                    "h-8 rounded-lg border-sidebar-border/50 bg-sidebar-accent/40 pl-8 pr-7",
                    "text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40",
                    "focus-visible:ring-1 focus-visible:ring-gold/50",
                    "transition-all duration-200",
                  )}
                />
                {search ? (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden rounded border border-sidebar-border/50 bg-sidebar-accent/60 px-1 py-0.5 text-[10px] font-mono text-sidebar-foreground/40 lg:inline-block">
                    /
                  </kbd>
                )}
              </div>
            </div>
          )}

          {filteredGroups.length === 0 && search && !collapsed && (
            <div className="px-3 py-4 text-center text-xs text-sidebar-foreground/50">
              Nenhum item encontrado
            </div>
          )}

          {filteredGroups.map((group) => (
            <GroupSection key={group.label} group={group} collapsed={collapsed} />
          ))}
        </SidebarContent>

        <SidebarFooter className="relative border-t border-sidebar-border/40 p-2">
          {collapsed ? (
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <Tooltip delayDuration={80}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      className="h-9 w-9 rounded-lg transition-all hover:bg-sidebar-accent hover:scale-105"
                    >
                      <Link to="/app/configuracoes" className="flex items-center justify-center">
                        <Settings className="h-[18px] w-[18px] text-sidebar-foreground/75" />
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>Configurações</TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Tooltip delayDuration={80}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      onClick={handleLogout}
                      className="h-9 w-9 rounded-lg transition-all hover:bg-destructive/20 hover:scale-105"
                    >
                      <LogOut className="h-[18px] w-[18px] text-sidebar-foreground/75" />
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>Sair</TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : (
            <div className="flex flex-col gap-1">
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="h-9 rounded-lg transition-all hover:bg-sidebar-accent hover:translate-x-0.5"
                  >
                    <Link to="/app/configuracoes" className="flex items-center gap-3">
                      <Settings className="h-[18px] w-[18px] text-sidebar-foreground/75" />
                      <span className="text-sm text-sidebar-foreground/85">Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className={cn(
                  "h-9 w-full justify-start rounded-lg px-2 text-sm",
                  "text-sidebar-foreground/80 transition-all",
                  "hover:bg-destructive/15 hover:text-destructive-foreground hover:translate-x-0.5",
                )}
              >
                <LogOut className="mr-3 h-[18px] w-[18px] shrink-0" />
                Sair
              </Button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
