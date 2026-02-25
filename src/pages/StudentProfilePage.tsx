import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { getMyStudentProfile } from "@/lib/api";
import {
  User, Mail, Phone, Hash, Calendar, MapPin, Heart,
  Users, GraduationCap, BookOpen, TrendingUp, DollarSign,
  Loader2, AlertCircle, Award, MessageSquare,
} from "lucide-react";

interface StudentData {
  name: string;
  email: string;
  roll_number?: string;
  class_name?: string;
  class_section?: string;
  academic_year_name?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  blood_group?: string;
  admission_date?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  status?: string;
  avatar?: string;
}

interface AttendanceData {
  total_days: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  percentage: number;
}

interface ExamResult {
  exam_name: string;
  subject_name: string;
  marks_obtained: number;
  total_marks: number;
  grade?: string;
  exam_type?: string;
}

interface FeeSummary {
  total_fees: number;
  paid_count: number;
  pending_count: number;
  total_amount: number;
  total_paid: number;
}

interface Remark {
  id: string;
  teacher_name: string;
  subject_name?: string;
  content: string;
  remark_type: string;
  created_at: string;
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyStudentProfile();
      if (res.success && res.data) {
        const d = res.data as {
          student: StudentData;
          attendance: AttendanceData;
          examResults: ExamResult[];
          feeSummary: FeeSummary;
          remarks: Remark[];
        };
        setStudent(d.student);
        setAttendance(d.attendance);
        setExamResults(d.examResults || []);
        setFeeSummary(d.feeSummary);
        setRemarks(d.remarks || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const initials = (student?.name || user?.name || "S")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const attPct = Number(attendance?.percentage) || 0;
  const avgScore = examResults.length > 0
    ? Math.round(examResults.reduce((s, e) => s + (e.marks_obtained / (e.total_marks || 100)) * 100, 0) / examResults.length)
    : 0;
  const feeDue = (feeSummary?.total_amount || 0) - (feeSummary?.total_paid || 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !student) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-muted-foreground text-sm">{error || "Profile not found"}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter max-w-5xl mx-auto">
        {/* Page title */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Your personal and academic information</p>
        </div>

        {/* Profile Header Card */}
        <Card className="shadow-card border-border/40 overflow-hidden">
          <div className="gradient-primary p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <Avatar className="h-24 w-24 ring-4 ring-white/20 shadow-lg">
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white">{student.name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {student.class_name || "—"} {student.class_section ? `- ${student.class_section}` : ""}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    Roll #{student.roll_number || "—"}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 capitalize">
                    {student.status || "active"}
                  </Badge>
                </div>
                {student.academic_year_name && (
                  <p className="text-white/70 text-sm mt-1">Academic Year: {student.academic_year_name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/50">
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{attPct}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Attendance</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{avgScore}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Avg. Score</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{examResults.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Exams Taken</p>
              </div>
              <div className="p-4 text-center">
                <p className={`text-2xl font-bold ${feeDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ₹{feeDue.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Fee Due</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info + Parent Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Phone" value={student.phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : undefined} />
              <InfoRow icon={User} label="Gender" value={student.gender} />
              <InfoRow icon={Heart} label="Blood Group" value={student.blood_group} />
              <InfoRow icon={MapPin} label="Address" value={student.address} />
              <InfoRow icon={Calendar} label="Admission Date" value={student.admission_date ? new Date(student.admission_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : undefined} />
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Parent / Guardian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={User} label="Name" value={student.parent_name} />
              <InfoRow icon={Mail} label="Email" value={student.parent_email} />
              <InfoRow icon={Phone} label="Phone" value={student.parent_phone} />
            </CardContent>
          </Card>
        </div>

        {/* Attendance Breakdown */}
        {attendance && (
          <Card className="shadow-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Overall Attendance</span>
                    <span className="font-semibold">{attPct}%</span>
                  </div>
                  <Progress value={attPct} className="h-3" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatMini label="Total Days" value={Number(attendance.total_days)} color="text-foreground" />
                  <StatMini label="Present" value={Number(attendance.present_count)} color="text-emerald-600" />
                  <StatMini label="Absent" value={Number(attendance.absent_count)} color="text-red-600" />
                  <StatMini label="Late" value={Number(attendance.late_count)} color="text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Exam Results */}
        {examResults.length > 0 && (
          <Card className="shadow-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Recent Exam Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Exam</th>
                      <th className="pb-2 font-medium">Subject</th>
                      <th className="pb-2 font-medium text-center">Marks</th>
                      <th className="pb-2 font-medium text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {examResults.map((e, i) => {
                      const pct = Math.round((e.marks_obtained / (e.total_marks || 100)) * 100);
                      return (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="py-2.5 font-medium">{e.exam_name}</td>
                          <td className="py-2.5 text-muted-foreground">{e.subject_name || "—"}</td>
                          <td className="py-2.5 text-center">
                            <span className="font-semibold">{e.marks_obtained}</span>
                            <span className="text-muted-foreground">/{e.total_marks}</span>
                            <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                          </td>
                          <td className="py-2.5 text-center">
                            <Badge variant={pct >= 80 ? "default" : pct >= 50 ? "secondary" : "destructive"} className="text-xs">
                              {e.grade || "—"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fee Summary */}
        {feeSummary && (
          <Card className="shadow-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Fee Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatMini label="Total Amount" value={`₹${Number(feeSummary.total_amount).toLocaleString("en-IN")}`} color="text-foreground" />
                <StatMini label="Paid" value={`₹${Number(feeSummary.total_paid).toLocaleString("en-IN")}`} color="text-emerald-600" />
                <StatMini label="Due" value={`₹${feeDue.toLocaleString("en-IN")}`} color={feeDue > 0 ? "text-red-600" : "text-emerald-600"} />
                <StatMini label="Pending Invoices" value={Number(feeSummary.pending_count)} color="text-amber-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teacher Remarks */}
        {remarks.length > 0 && (
          <Card className="shadow-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Teacher Remarks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {remarks.map((r) => (
                <div key={r.id} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{r.teacher_name}</span>
                    <div className="flex items-center gap-2">
                      {r.subject_name && (
                        <Badge variant="outline" className="text-xs">{r.subject_name}</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs capitalize">{r.remark_type}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.content}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── Helpers ── */

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/30">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
