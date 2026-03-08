import { useState, useEffect, useCallback } from "react";
import { Clock, MapPin, AlertCircle, Loader2, GraduationCap, Building2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTimetable, getClasses, getExams } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { TimetableEntry, Class as ClassType, Exam } from "@/types";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { ManageTimetableDialog } from "@/components/timetable/ManageTimetableDialog";
import { InstituteSelector } from "@/components/InstituteSelector";
import type { Institute } from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Timetable() {
  const { isRole } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);

  const isSuperAdmin = isRole('super_admin');
  const showClassFilter = isRole('super_admin', 'institute_admin', 'faculty');
  const isStudent = isRole('student');
  const isParent = isRole('parent');
  const isViewOnly = isStudent || isParent;

  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(() => {
    if (isSuperAdmin) {
      return localStorage.getItem('super_admin_selected_institute');
    }
    return null;
  });

  const handleInstituteSelect = (instituteId: string | null, _institute: Institute | null) => {
    setSelectedInstituteId(instituteId);
    if (instituteId) {
      localStorage.setItem('super_admin_selected_institute', instituteId);
    } else {
      localStorage.removeItem('super_admin_selected_institute');
    }
  };

  const fetchData = useCallback(async () => {
    if (isSuperAdmin && !selectedInstituteId) {
      setEntries([]);
      setExams([]);
      setClasses([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (classFilter !== "all") params.class_id = classFilter;
      if (isSuperAdmin && selectedInstituteId) params.institute_id = selectedInstituteId;

      const [ttRes, clsRes, examRes] = await Promise.all([
        getTimetable(params),
        showClassFilter ? getClasses(isSuperAdmin && selectedInstituteId ? { institute_id: selectedInstituteId } : undefined) : Promise.resolve(null),
        getExams({ ...params, status: "scheduled" }),
      ]);

      if (ttRes.success && ttRes.data) {
        setEntries((ttRes.data as { timetable: TimetableEntry[] }).timetable || []);
      }
      if (clsRes?.success && clsRes.data) {
        setClasses((clsRes.data as { classes: ClassType[] }).classes || []);
      }
      if (examRes.success && examRes.data) {
        setExams((examRes.data as { exams: Exam[] }).exams || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [classFilter, showClassFilter, isSuperAdmin, selectedInstituteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group entries by day
  const dayMap = new Map<number, { periods: TimetableEntry[], exams: Exam[] }>();

  // First initialize all 7 days for a complete week view if we have data
  if (entries.length > 0 || exams.length > 0) {
    for (let i = 1; i <= 6; i++) dayMap.set(i, { periods: [], exams: [] }); // Mon-Sat
  }

  entries.forEach(e => {
    const list = dayMap.get(e.day_of_week) || { periods: [], exams: [] };
    list.periods.push(e);
    dayMap.set(e.day_of_week, list);
  });

  exams.forEach(e => {
    if (e.exam_date) {
      const date = new Date(e.exam_date);
      const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday ...

      // We map Sunday (0) to 7 or keep as 0 depending on convention. 
      // The DB uses 0-6. Let's stick with JS Date getDay (0-6).
      const list = dayMap.get(dayOfWeek) || { periods: [], exams: [] };
      list.exams.push(e);
      dayMap.set(dayOfWeek, list);
    }
  });

  // Sorted unique days
  const days = Array.from(dayMap.keys()).sort((a, b) => {
    // Sort Monday (1) to Sunday (0 -> 7)
    const sortA = a === 0 ? 7 : a;
    const sortB = b === 0 ? 7 : b;
    return sortA - sortB;
  });

  // All unique periods across all days for table header alignment
  const allPeriods = Array.from(new Set(entries.map(e => e.period_number))).sort((a, b) => a - b);

  const getPeriodColor = (entry?: TimetableEntry) => {
    if (!entry) return "bg-muted/30 border-muted-foreground/10 text-muted-foreground";
    if (entry.room?.toLowerCase().includes("lab")) return "bg-accent/10 border-accent/20 text-accent";
    return "bg-primary/10 border-primary/20 text-primary";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {isParent ? "Child's Weekly Timetable" : isStudent ? 'My Weekly Timetable' : 'Weekly Timetable'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isViewOnly
                ? 'View your class schedule, period timings, and upcoming exams.'
                : 'Manage class schedules, period timings, and upcoming exams across classes.'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {isSuperAdmin && (
              <InstituteSelector
                selectedInstituteId={selectedInstituteId}
                onSelectInstitute={handleInstituteSelect}
              />
            )}
            {showClassFilter && (!isSuperAdmin || selectedInstituteId) && (
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {showClassFilter && classFilter !== "all" && (!isSuperAdmin || selectedInstituteId) && (
              <Button onClick={() => setShowManage(true)} className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md">
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Timetable
              </Button>
            )}
          </div>
        </div>

        {/* Super Admin - No Institute Selected */}
        {isSuperAdmin && !selectedInstituteId && (
          <div className="flex flex-col items-center justify-center h-[400px] text-center gap-4">
            <div className="p-6 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl border border-primary/20">
              <Building2 className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select an Institute</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Please select an institute from the dropdown above to view and manage timetables.
              </p>
            </div>
          </div>
        )}

        {/* Main Content - Only show when institute is selected (for super admin) or always (for others) */}
        {(!isSuperAdmin || selectedInstituteId) && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 bg-card px-4 py-3 rounded-xl border border-border/50 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" />
                <span className="text-sm font-medium">Standard Class</span>
              </div>
              <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent/20 border border-accent/40" />
            <span className="text-sm font-medium">Lab Session</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" />
            <span className="text-sm font-medium">Examination</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted border border-muted-foreground/20" />
            <span className="text-sm font-medium text-muted-foreground">Free Period</span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading timetable...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && entries.length === 0 && exams.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed shadow-sm">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold">No Timetable Entries</h3>
            <p className="text-muted-foreground text-sm mt-1">No schedule found for the selected view.</p>
          </div>
        )}

        {!loading && !error && (entries.length > 0 || exams.length > 0) && (
          <>
            {/* Mobile View — cards per day */}
            <div className="md:hidden space-y-4">
              {days.map(dayNum => {
                const dayData = dayMap.get(dayNum) || { periods: [], exams: [] };
                if (dayData.periods.length === 0 && dayData.exams.length === 0) return null;

                const dayEntries = dayData.periods.sort((a, b) => a.period_number - b.period_number);

                return (
                  <Card key={dayNum} className="shadow-sm border-border/50">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                      <CardTitle className="text-lg flex justify-between items-center">
                        {DAY_NAMES[dayNum]}
                        {dayData.exams.length > 0 && (
                          <Badge variant="destructive" className="bg-red-500 text-white">
                            {dayData.exams.length} Exam{dayData.exams.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">

                      {/* Render Exams First */}
                      {dayData.exams.map(exam => (
                        <div key={`mob-exam-${exam.id}`} className="p-3 rounded-lg border bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                          <div className="flex items-center justify-between mb-1 relative z-10">
                            <span className="font-bold flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              {exam.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] border-red-500/30 font-bold uppercase tracking-wider">{exam.exam_type.replace('_', ' ')}</Badge>
                          </div>
                          <div className="flex flex-col gap-1 text-sm mt-2 relative z-10 opacity-90">
                            {exam.subject_name && (
                              <span className="font-medium">Subject: {exam.subject_name}</span>
                            )}
                            {exam.class_name && (
                              <span className="opacity-80">Class: {exam.class_name}</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Render Classes */}
                      {dayEntries.map(entry => (
                        <div key={entry.id} className={`p-3 rounded-lg border ${getPeriodColor(entry)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{entry.subject_name || "—"}</span>
                            <Badge variant="outline" className="text-xs bg-background/50">Period {entry.period_number}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm opacity-80 mt-2">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="h-3.5 w-3.5" />
                              {entry.start_time?.slice(0, 5)} – {entry.end_time?.slice(0, 5)}
                            </span>
                            {entry.room && (
                              <span className="flex items-center gap-1.5 font-medium">
                                <MapPin className="h-3.5 w-3.5" />
                                {entry.room}
                              </span>
                            )}
                          </div>
                          {entry.teacher_name && (
                            <p className="text-sm opacity-70 mt-1">{entry.teacher_name}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop View — grid table */}
            <div className="hidden md:block">
              <Card className="shadow-sm border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/50">
                        <th className="text-left p-4 font-semibold text-muted-foreground w-24 border-r border-border/50">Period</th>
                        {days.map(d => (
                          <th key={d} className="text-center p-4 font-bold text-foreground min-w-[180px]">
                            <div className="flex flex-col items-center">
                              {DAY_NAMES[d]}
                              {(dayMap.get(d)?.exams?.length || 0) > 0 && (
                                <Badge variant="destructive" className="mt-2 text-[10px] scale-90">EXAMS SCHEDULED</Badge>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Top Row for ALL-DAY EXAMS on that day */}
                      {days.some(d => (dayMap.get(d)?.exams?.length || 0) > 0) && (
                        <tr className="border-b-2 border-dashed border-red-500/20 bg-red-500/5">
                          <td className="p-4 font-semibold text-red-500/70 border-r border-border/50 uppercase tracking-widest text-xs text-center align-middle">
                            <GraduationCap className="h-5 w-5 mx-auto mb-1 opacity-50" />
                            Exams
                          </td>
                          {days.map(d => {
                            const dailyExams = dayMap.get(d)?.exams || [];
                            return (
                              <td key={`exam-col-${d}`} className="p-3 align-top">
                                <div className="space-y-2">
                                  {dailyExams.map((exam, idx) => (
                                    <div key={`desk-exam-${idx}`} className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 shadow-sm relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150"></div>
                                      <div className="font-bold mb-1 relative z-10">{exam.name}</div>
                                      <div className="text-xs font-medium opacity-90 relative z-10">{exam.class_name} {exam.subject_name ? `• ${exam.subject_name}` : ''}</div>
                                      <Badge variant="outline" className="mt-2 text-[9px] border-red-500/30 uppercase tracking-wider relative z-10 bg-background/50 backdrop-blur">
                                        {exam.exam_type.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* Standard Periods */}
                      {allPeriods.map((pNum, index) => (
                        <tr key={pNum} className="border-b border-border/50 last:border-0 hover:bg-muted/5 transition-colors">
                          <td className="p-4 font-semibold text-muted-foreground border-r border-border/50 text-center">
                            Period {pNum}
                          </td>
                          {days.map(d => {
                            const entry = (dayMap.get(d)?.periods || []).find(e => e.period_number === pNum);
                            return (
                              <td key={d} className="p-2 border-r border-border/10 last:border-0 align-top">
                                <div className={`p-3 rounded-xl border ${getPeriodColor(entry)} h-full min-h-[100px] flex flex-col justify-between transition-colors`}>
                                  {entry ? (
                                    <>
                                      <div>
                                        <div className="font-bold mb-1 text-foreground/90">{entry.subject_name || "—"}</div>
                                        {entry.teacher_name && (
                                          <div className="text-xs font-medium opacity-70 mb-2">{entry.teacher_name}</div>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold opacity-70">
                                          <Clock className="h-3 w-3" />
                                          <span>{entry.start_time?.slice(0, 5)}</span>
                                        </div>
                                        {entry.room && (
                                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-background/50 px-1.5 py-0.5 rounded">
                                            {entry.room}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      <div className="w-8 h-1 rounded-full bg-border/50"></div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}
          </>
        )}
      </div>

      {showManage && classFilter !== "all" && (
        <ManageTimetableDialog
          classId={classFilter}
          className={classes.find(c => c.id === classFilter)?.name + " " + classes.find(c => c.id === classFilter)?.section || ""}
          initialEntries={entries}
          open={showManage}
          onOpenChange={setShowManage}
          onSuccess={fetchData}
        />
      )}
    </DashboardLayout>
  );
}
