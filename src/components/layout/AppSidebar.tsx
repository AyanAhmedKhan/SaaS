import {
  LayoutDashboard,
  Users,
  User,
  GraduationCap,
  UserCheck,
  CalendarDays,
  FileText,
  Bell,
  Settings,
  LogOut,
  BookOpen,
  ClipboardList,
  Award,
  DollarSign,
  Building2,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserRole } from "@/types";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[]; // if omitted, visible to all
  module?: string;    // optional module-gate
}

const ADMIN: UserRole[] = ['super_admin', 'institute_admin'];
const STAFF: UserRole[] = ['super_admin', 'institute_admin', 'class_teacher', 'subject_teacher'];

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: GraduationCap, roles: STAFF },
  { title: "Teachers", url: "/teachers", icon: Users, roles: ADMIN },
  { title: "Attendance", url: "/attendance", icon: UserCheck },
  { title: "Timetable", url: "/timetable", icon: CalendarDays },
  { title: "Syllabus", url: "/syllabus", icon: BookOpen },
  { title: "Assignments", url: "/assignments", icon: ClipboardList },
  { title: "Exams", url: "/exams", icon: Award },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: STAFF },
  { title: "Notices", url: "/notices", icon: Bell },
  { title: "Fees", url: "/fees", icon: DollarSign, roles: [...ADMIN, 'student', 'parent'] },
  { title: "My Profile", url: "/profile", icon: User, roles: ['student'] },
  { title: "Institutes", url: "/institutes", icon: Building2, roles: ['super_admin'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout, isRole, hasModule } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Filter menu items by user role and module access
  const visibleItems = menuItems.filter((item) => {
    if (item.roles && user && !item.roles.includes(user.role)) return false;
    if (item.module && !hasModule(item.module)) return false;
    return true;
  });

  const roleLabel = user?.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User';

  return (
    <Sidebar className="border-r-0" collapsible="icon">
      {/* Header */}
      <SidebarHeader className="gradient-primary p-4 relative overflow-hidden">
        {/* Subtle glow effect in header */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-lg shadow-accent/30 transition-transform duration-200 hover:scale-105">
            <GraduationCap className="h-6 w-6 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-fade-in">
              <span className="text-lg font-bold text-sidebar-foreground tracking-tight">EduYantra</span>
              <span className="text-[11px] text-sidebar-foreground/60 font-medium">School Management</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="bg-sidebar px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-[0.1em] font-semibold px-3 mb-2">
            {!collapsed && "Main Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/70 transition-all duration-200 relative group",
                        "hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                        isActive(item.url) && "bg-sidebar-accent text-sidebar-primary font-semibold"
                      )}
                    >
                      {/* Active indicator bar */}
                      {isActive(item.url) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary animate-scale-in" />
                      )}
                      <item.icon className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                        isActive(item.url) ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground"
                      )} />
                      {!collapsed && (
                        <span className="text-[13px]">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground transition-all duration-200"
                  >
                    <Settings className="h-[18px] w-[18px]" />
                    {!collapsed && <span className="text-[13px]">Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - User Profile */}
      <SidebarFooter className="bg-sidebar border-t border-sidebar-border/50 p-3">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/20">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {/* Online status dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-sidebar-background" />
          </div>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                {user?.name || 'Guest'}
              </span>
              <span className="truncate text-[11px] text-sidebar-foreground/50 font-medium">
                {roleLabel}
              </span>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
