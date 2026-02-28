import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
    Users, CalendarDays, ClipboardList, Bell,
    ChevronRight, RefreshCw, AlertCircle, Clock, CheckCircle2
} from "lucide-react";
import { getTeacherDashboard } from "@/lib/api";
import { cn } from "@/lib/utils";
import { NoticeBoard } from "@/components/dashboard/NoticeBoard";
import { AssignmentManagement } from "@/components/teacher/AssignmentManagement";

interface AssignedClass {
    class_id: string;
    class_name: string;
    section: string;
    subject_name: string | null;
    student_count: number;
}

interface TodayAttendance {
    class_id: string;
    class_name: string;
    present: number;
    absent: number;
    total: number;
}

interface UpcomingAssignment {
    id: string;
    title: string;
    class_id: string;
    subject_id: string;
    due_date: string;
}

interface Notice {
    id: string | number;
    title: string;
    content: string;
    date: string;
    priority: 'high' | 'medium' | 'low';
    created_at?: string;
}

interface TeacherDashboardData {
    assignedClasses: AssignedClass[];
    todayAttendance: TodayAttendance[];
    upcomingAssignments: UpcomingAssignment[];
    recentNotices: Notice[];
}

export default function TeacherDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<TeacherDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            else setRefreshing(true);
            setError(null);

            const response = await getTeacherDashboard();
            if (response.success && response.data) {
                setData(response.data as TeacherDashboardData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard");
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <div className="relative">
                        <div className="h-12 w-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium animate-pulse-slow">Loading your dashboard...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4 px-4">
                    <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-7 w-7 text-destructive" />
                    </div>
                    <div>
                        <p className="text-foreground font-semibold mb-1">Something went wrong</p>
                        <p className="text-muted-foreground text-sm max-w-md">{error}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchData()}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const firstName = user?.name?.split(" ")[0] || "Teacher";
    const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const pendingAttendance = data?.assignedClasses?.length ? data.assignedClasses.length - (data?.todayAttendance?.length || 0) : 0;

    return (
        <DashboardLayout>
            <div className="space-y-4 sm:space-y-6 page-enter">
                {/* HERO SECTION */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/15 p-4 sm:p-6 md:p-8">
                    <div className="absolute -top-12 -right-12 w-28 sm:w-40 h-28 sm:h-40 rounded-full bg-primary/5 blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-20 sm:w-32 h-20 sm:h-32 rounded-full bg-accent/10 blur-2xl" />

                    <div className="relative flex flex-col gap-3 sm:gap-4">
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                                {todayLabel}
                            </p>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                                {getGreeting()}, {firstName}!
                            </h1>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                    {(data?.assignedClasses?.some(c => !c.subject_name) && data?.assignedClasses?.some(c => c.subject_name))
                                        ? 'Class & Subject Teacher'
                                        : (user?.role === 'class_teacher' || data?.assignedClasses?.some(c => !c.subject_name))
                                            ? 'Class Teacher'
                                            : 'Subject Teacher'}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline" size="sm"
                                onClick={() => fetchData(true)}
                                disabled={refreshing}
                                className="h-8 sm:h-9 text-xs sm:text-sm"
                            >
                                <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                                <span>Refresh</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* QUICK STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center">
                            <div className="p-2 sm:p-3 bg-primary/10 rounded-xl mb-2 sm:mb-3">
                                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold">{data?.assignedClasses?.length || 0}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">Assigned Classes</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center">
                            <div className={cn("p-2 sm:p-3 rounded-xl mb-2 sm:mb-3", pendingAttendance > 0 ? "bg-amber-500/10" : "bg-green-500/10")}>
                                <CheckCircle2 className={cn("h-5 w-5 sm:h-6 sm:w-6", pendingAttendance > 0 ? "text-amber-500" : "text-green-500")} />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold">{data?.todayAttendance?.length || 0}/{data?.assignedClasses?.length || 0}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">Attendance Marked</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center">
                            <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl mb-2 sm:mb-3">
                                <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold">{data?.upcomingAssignments?.length || 0}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">Active Assignments</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center">
                            <div className="p-2 sm:p-3 bg-purple-500/10 rounded-xl mb-2 sm:mb-3">
                                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold">{data?.recentNotices?.length || 0}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">Recent Notices</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* ASSIGNED CLASSES & ATTENDANCE */}
                    <Card className="border-border/40 shadow-card flex flex-col">
                        <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                            <CardTitle className="text-sm sm:text-lg font-semibold flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                    My Classes
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate("/attendance")} className="text-xs h-7 sm:h-8">
                                    Mark Attendance <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 pb-4 sm:pb-6 flex-1 max-h-[400px] overflow-y-auto">
                            {data?.assignedClasses?.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground mb-1">No classes assigned</p>
                                    <p className="text-xs text-muted-foreground/60">Contact the administration to assign classes.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data?.assignedClasses?.map((cls, idx) => {
                                        const attendanceTaken = data?.todayAttendance?.find(a => a.class_id === cls.class_id);
                                        return (
                                            <div key={`${cls.class_id}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/5 transition-colors">
                                                <div>
                                                    <p className="font-semibold text-sm sm:text-base">{cls.class_name} {cls.section}</p>
                                                    <p className="text-xs text-muted-foreground">{cls.subject_name || 'Class Teacher'} • {cls.student_count} Students</p>
                                                </div>
                                                <div>
                                                    {attendanceTaken ? (
                                                        <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10 text-xs gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Marked
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-500/10 text-xs">
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* UPCOMING ASSIGNMENTS */}
                    <Card className="border-border/40 shadow-card flex flex-col">
                        <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                            <CardTitle className="text-sm sm:text-lg font-semibold flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                                    Pending Assignments
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate("/assignments")} className="text-xs h-7 sm:h-8">
                                    View All <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 pb-4 sm:pb-6 flex-1 max-h-[400px] overflow-y-auto">
                            {data?.upcomingAssignments?.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground mb-1">No upcoming assignments</p>
                                    <p className="text-xs text-muted-foreground/60">You have no assignments nearing their due date.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {data?.upcomingAssignments?.map((assignment) => {
                                        const daysLeft = Math.ceil((new Date(assignment.due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                        return (
                                            <div key={assignment.id} className="p-3 rounded-lg border border-border/50 bg-card hover:border-blue-500/30 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-semibold text-sm line-clamp-1 flex-1">{assignment.title}</p>
                                                    <Badge variant="secondary" className="text-[10px] whitespace-nowrap ml-2">
                                                        {daysLeft > 0 ? `${daysLeft} days left` : 'Due today'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="col-span-1 lg:col-span-2 mt-4 sm:mt-6">
                        <NoticeBoard notices={data?.recentNotices?.map(n => ({ ...n, date: n.date || n.created_at || new Date().toISOString() })) as any} />
                    </div>
                </div>

                {/* ASSIGNMENT MANAGEMENT SECTION */}
                <div className="mt-6">
                    <AssignmentManagement />
                </div>
            </div>
        </DashboardLayout>
    );
}
