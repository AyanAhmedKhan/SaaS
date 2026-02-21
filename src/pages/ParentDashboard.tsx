import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { 
  User,
  Calendar, 
  CreditCard, 
  MessageSquare,
  TrendingUp,
  Bell,
  CheckCircle2,
  Clock,
  Phone,
  BookOpen,
  Award
} from "lucide-react";

const childInfo = {
  name: "Arjun Sharma",
  class: "10th A",
  rollNo: "2024-1001",
  avatar: "",
  attendance: 92,
  avgScore: 78,
  rank: 5
};

const attendanceData = [
  { month: "Jan", present: 22, total: 24 },
  { month: "Dec", present: 20, total: 22 },
  { month: "Nov", present: 21, total: 23 },
];

const subjectPerformance = [
  { subject: "Mathematics", score: 85, grade: "A" },
  { subject: "Physics", score: 78, grade: "B+" },
  { subject: "Chemistry", score: 82, grade: "A" },
  { subject: "English", score: 76, grade: "B+" },
  { subject: "Hindi", score: 88, grade: "A" },
];

const feeDetails = {
  total: 45000,
  paid: 30000,
  pending: 15000,
  nextDue: "Feb 15, 2025",
  lastPaid: "Jan 5, 2025"
};

const recentActivities = [
  { id: 1, type: "attendance", message: "Arjun was present today", time: "9:15 AM", date: "Today" },
  { id: 2, type: "grade", message: "Mathematics Unit Test: 85/100", time: "2:30 PM", date: "Yesterday" },
  { id: 3, type: "notice", message: "PTM scheduled for Feb 5", time: "10:00 AM", date: "Jan 25" },
  { id: 4, type: "homework", message: "Physics assignment submitted", time: "4:45 PM", date: "Jan 24" },
];

const teachers = [
  { name: "Mr. Sharma", subject: "Mathematics", phone: "+91 98765 43210" },
  { name: "Dr. Patel", subject: "Physics", phone: "+91 98765 43211" },
  { name: "Mrs. Gupta", subject: "English", phone: "+91 98765 43212" },
];

export default function ParentDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome, {user?.name?.split(' ')[0] || 'Parent'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Track your child's academic progress and stay connected
          </p>
        </div>

        {/* Child Info Card */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarImage src={childInfo.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {childInfo.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{childInfo.name}</h2>
                <p className="text-muted-foreground">
                  Class {childInfo.class} • Roll No: {childInfo.rollNo}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 md:gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{childInfo.attendance}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-foreground">{childInfo.avgScore}%</p>
                  <p className="text-xs text-muted-foreground">Avg. Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">#{childInfo.rank}</p>
                  <p className="text-xs text-muted-foreground">Class Rank</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insight */}
        <AIInsightCard
          data={{
            attendance: 92,
            avgScore: 78,
            assignmentCompletion: 85,
            recentTrend: "stable",
            topSubject: "Hindi",
            weakSubject: "English",
          }}
          role="parent"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fee Status */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Fee Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium text-foreground">₹{feeDetails.paid.toLocaleString()}</span>
                </div>
                <Progress value={(feeDetails.paid / feeDetails.total) * 100} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹{feeDetails.paid.toLocaleString()} paid</span>
                  <span>₹{feeDetails.total.toLocaleString()} total</span>
                </div>
              </div>
              
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Pending Amount</p>
                    <p className="text-xs text-muted-foreground">Due: {feeDetails.nextDue}</p>
                  </div>
                  <p className="text-lg font-bold text-amber-600">₹{feeDetails.pending.toLocaleString()}</p>
                </div>
              </div>

              <Button className="w-full" variant="default">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {attendanceData.map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">{month.month} 2025</span>
                    <span className="text-sm text-muted-foreground">
                      {month.present}/{month.total} days
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(month.present / month.total) * 100} 
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-medium text-foreground w-12 text-right">
                      {Math.round((month.present / month.total) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Present Today</p>
                  <p className="text-xs text-muted-foreground">Checked in at 8:45 AM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className={`p-1.5 rounded-full ${
                    activity.type === 'attendance' ? 'bg-green-500/20' :
                    activity.type === 'grade' ? 'bg-blue-500/20' :
                    activity.type === 'notice' ? 'bg-amber-500/20' : 'bg-purple-500/20'
                  }`}>
                    {activity.type === 'attendance' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    {activity.type === 'grade' && <Award className="h-3.5 w-3.5 text-blue-500" />}
                    {activity.type === 'notice' && <Bell className="h-3.5 w-3.5 text-amber-500" />}
                    {activity.type === 'homework' && <BookOpen className="h-3.5 w-3.5 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.date} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject Performance */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Subject-wise Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subjectPerformance.map((subject, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{subject.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{subject.score}%</span>
                      <Badge variant="outline" className="text-xs">
                        {subject.grade}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={subject.score} 
                    className={`h-2 ${
                      subject.score >= 80 ? '[&>div]:bg-green-500' :
                      subject.score >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                    }`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Teachers */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Contact Teachers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teachers.map((teacher, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {teacher.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground">{teacher.subject}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" className="w-full mt-2">
                <User className="h-4 w-4 mr-2" />
                View All Teachers
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Notices Section */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Important Notices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-600">High Priority</span>
                </div>
                <p className="font-medium text-foreground">Annual Sports Day</p>
                <p className="text-sm text-muted-foreground mt-1">Feb 15, 2025 at 9:00 AM</p>
              </div>
              
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-amber-600">Medium Priority</span>
                </div>
                <p className="font-medium text-foreground">Parent-Teacher Meeting</p>
                <p className="text-sm text-muted-foreground mt-1">Feb 5, 2025 at 10:00 AM</p>
              </div>
              
              <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-green-600">Information</span>
                </div>
                <p className="font-medium text-foreground">Science Exhibition</p>
                <p className="text-sm text-muted-foreground mt-1">Registration open till Feb 10</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
