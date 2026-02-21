import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Calendar, Clock, GraduationCap, TrendingUp, FileText } from "lucide-react";
import { StudentProfile } from "@/components/student/StudentProfile";
import { SubjectPerformance } from "@/components/student/SubjectPerformance";
import { AssignmentsPanel } from "@/components/student/AssignmentsPanel";
import { NotificationsWidget } from "@/components/student/NotificationsWidget";
import { AttendanceHistory } from "@/components/student/AttendanceHistory";
import { TeacherFeedback } from "@/components/student/TeacherFeedback";
import { AIPlaceholders } from "@/components/student/AIPlaceholders";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";

const todayClasses = [
  { id: 1, subject: "Mathematics", time: "9:00 AM - 10:00 AM", teacher: "Mr. Sharma", room: "Room 101", status: "completed" },
  { id: 2, subject: "Physics", time: "10:15 AM - 11:15 AM", teacher: "Dr. Patel", room: "Lab 2", status: "ongoing" },
  { id: 3, subject: "English", time: "11:30 AM - 12:30 PM", teacher: "Mrs. Gupta", room: "Room 105", status: "upcoming" },
  { id: 4, subject: "Chemistry", time: "2:00 PM - 3:00 PM", teacher: "Dr. Verma", room: "Lab 1", status: "upcoming" },
];

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {user?.name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="text-muted-foreground">Here's your academic overview for today</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">92%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">78%</p>
                  <p className="text-xs text-muted-foreground">Avg. Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <FileText className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">5</p>
                  <p className="text-xs text-muted-foreground">Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-muted to-muted/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted-foreground/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">4</p>
                  <p className="text-xs text-muted-foreground">Classes Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insight */}
        <AIInsightCard
          data={{
            attendance: 92,
            avgScore: 78,
            assignmentCompletion: 80,
            recentTrend: "improving",
            topSubject: "English",
            weakSubject: "Biology",
          }}
          role="student"
        />

        {/* Student Profile */}
        <StudentProfile />

        {/* Schedule + Subject Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayClasses.map((cls) => (
                <div
                  key={cls.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    cls.status === "ongoing"
                      ? "bg-primary/5 border-primary/30"
                      : cls.status === "completed"
                      ? "bg-muted/50 border-border"
                      : "bg-card border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cls.status === "ongoing" ? "bg-primary/20" : "bg-muted"}`}>
                      <BookOpen className={`h-4 w-4 ${cls.status === "ongoing" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{cls.subject}</p>
                      <p className="text-xs text-muted-foreground">{cls.teacher} - {cls.room}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{cls.time}</p>
                    <Badge
                      variant={cls.status === "ongoing" ? "default" : cls.status === "completed" ? "secondary" : "outline"}
                      className="text-xs mt-1"
                    >
                      {cls.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <SubjectPerformance />
        </div>

        {/* Assignments + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssignmentsPanel />
          <div className="space-y-6">
            <NotificationsWidget />
            <AttendanceHistory />
          </div>
        </div>

        {/* Teacher Feedback */}
        <TeacherFeedback />

        {/* AI Placeholders */}
        <AIPlaceholders />
      </div>
    </DashboardLayout>
  );
}
