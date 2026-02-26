import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Search, ChevronRight, Clock, Megaphone, AlertTriangle, Info, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { getNotices } from "@/lib/api";
import type { Notice } from "@/types";

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/teachers': 'Teachers',
  '/attendance': 'Attendance',
  '/timetable': 'Timetable',
  '/syllabus': 'Syllabus',
  '/reports': 'Reports',
  '/notices': 'Notices',
  '/assignments': 'Assignments',
  '/exams': 'Exams',
  '/fees': 'Fee Management',
  '/institutes': 'Institutes',
  '/grading': 'Grading',
  '/feedback': 'Feedback',
  '/settings': 'Settings',
};

// All navigable pages for the search
const searchablePages = [
  { name: "Dashboard", path: "/dashboard", keywords: ["home", "overview", "stats"] },
  { name: "Students", path: "/students", keywords: ["student", "pupils", "learners", "enrollment"] },
  { name: "Teachers", path: "/teachers", keywords: ["teacher", "staff", "faculty", "instructor"] },
  { name: "Attendance", path: "/attendance", keywords: ["absent", "present", "attendance", "late"] },
  { name: "Timetable", path: "/timetable", keywords: ["schedule", "period", "class", "time table"] },
  { name: "Syllabus", path: "/syllabus", keywords: ["curriculum", "topic", "chapter", "lesson"] },
  { name: "Reports", path: "/reports", keywords: ["report", "analytics", "performance", "trend"] },
  { name: "Notices", path: "/notices", keywords: ["notice", "announcement", "bulletin", "circular"] },
  { name: "Assignments", path: "/assignments", keywords: ["homework", "task", "submission", "assignment"] },
  { name: "Exams", path: "/exams", keywords: ["exam", "test", "quiz", "assessment", "result"] },
  { name: "Fee Management", path: "/fees", keywords: ["fee", "payment", "dues", "tuition", "money"] },
  { name: "Settings", path: "/settings", keywords: ["settings", "profile", "password", "account", "preference"] },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeCount, setNoticeCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch recent notices for bell icon
  const fetchNotices = useCallback(async () => {
    try {
      const res = await getNotices({ limit: '5', page: '1' });
      if (res.success && res.data) {
        const data = res.data as { notices: Notice[]; pagination: { total: number } };
        setNotices(data.notices || []);
        setNoticeCount(data.pagination?.total || 0);
      }
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotices();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNotices, 120_000);
    return () => clearInterval(interval);
  }, [fetchNotices]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter results for search
  const searchResults = searchQuery.trim().length > 0
    ? searchablePages.filter(page => {
      const q = searchQuery.toLowerCase();
      return (
        page.name.toLowerCase().includes(q) ||
        page.keywords.some(k => k.includes(q))
      );
    })
    : [];

  const handleSearchSelect = (path: string) => {
    setSearchQuery("");
    setSearchOpen(false);
    navigate(path);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
      case 'medium':
        return <Megaphone className="h-4 w-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

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
        {/* Search Bar */}
        <div className="relative hidden md:flex max-w-md flex-1 ml-auto" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search pages... (students, exams, fees...)"
            className="pl-10 bg-muted/30 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl h-10 text-sm transition-all duration-200 focus-visible:bg-background"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchOpen(false);
                setSearchQuery("");
                inputRef.current?.blur();
              }
              if (e.key === 'Enter' && searchResults.length > 0) {
                handleSearchSelect(searchResults[0].path);
              }
            }}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {searchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border/50 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((page) => (
                    <button
                      key={page.path}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                      onClick={() => handleSearchSelect(page.path)}
                    >
                      <Search className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      <span className="font-medium">{page.name}</span>
                      <span className="text-xs text-muted-foreground/50 ml-auto">{page.path}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No pages found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
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
              {noticeCount > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground border-2 border-background animate-scale-in"
                >
                  {noticeCount > 9 ? '9+' : noticeCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-xl">
            <DropdownMenuLabel className="font-semibold flex items-center justify-between">
              <span>Notifications</span>
              {noticeCount > 0 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {noticeCount} total
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {notices.length > 0 ? (
              <>
                {notices.map((notice) => (
                  <DropdownMenuItem
                    key={notice.id}
                    className="flex items-start gap-3 py-3 px-3 cursor-pointer focus:bg-muted/50"
                    onClick={() => navigate('/notices')}
                  >
                    {getPriorityIcon(notice.priority)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-1">{notice.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {notice.content ? notice.content.substring(0, 60) + (notice.content.length > 60 ? '...' : '') : ''}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notice.created_at)}</p>
                    </div>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center text-primary font-medium cursor-pointer py-2.5"
                  onClick={() => navigate('/notices')}
                >
                  View all notices
                </DropdownMenuItem>
              </>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                No notifications yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
