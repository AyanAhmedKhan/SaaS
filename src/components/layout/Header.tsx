import { useState, useEffect } from "react";
import { Bell, Search, ChevronRight, Clock } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/teachers': 'Teachers',
  '/attendance': 'Attendance',
  '/timetable': 'Timetable',
  '/syllabus': 'Syllabus',
  '/reports': 'Reports',
  '/notices': 'Notices',
  '/feedback': 'Feedback',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationCount] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const pageName = pageNames[location.pathname] || 'Page';

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border/40 px-4 md:px-6 glass-subtle">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />

      {/* Breadcrumb */}
      <div className="hidden sm:flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground/60 font-medium">EduYantra</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
        <span className="text-foreground font-semibold">{pageName}</span>
      </div>

      <div className="flex-1 flex items-center gap-4">
        <div className="relative hidden md:flex max-w-md flex-1 ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            type="search"
            placeholder="Search students, teachers, classes..."
            className="pl-10 bg-muted/30 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl h-10 text-sm transition-all duration-200 focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Current time */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground/60 font-medium">
          <Clock className="h-3.5 w-3.5" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-muted/60 transition-all duration-200">
              <Bell className="h-[18px] w-[18px]" />
              {notificationCount > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground border-2 border-background animate-scale-in"
                >
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-xl">
            <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              Connect to backend to see live notifications
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary font-medium cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
