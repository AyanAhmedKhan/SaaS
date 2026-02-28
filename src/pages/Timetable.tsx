import { useState, useEffect, useCallback } from "react";
import { Clock, MapPin, AlertCircle, Loader2 } from "lucide-react";
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
import { getTimetable, getClasses } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { TimetableEntry, Class as ClassType } from "@/types";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { ManageTimetableDialog } from "@/components/timetable/ManageTimetableDialog";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Timetable() {
  const { isRole } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);

  const showClassFilter = isRole('super_admin', 'institute_admin', 'class_teacher', 'subject_teacher');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (classFilter !== "all") params.class_id = classFilter;

      const [ttRes, clsRes] = await Promise.all([
        getTimetable(params),
        showClassFilter ? getClasses() : Promise.resolve(null),
      ]);

      if (ttRes.success && ttRes.data) {
        setEntries((ttRes.data as { timetable: TimetableEntry[] }).timetable || []);
      }
      if (clsRes?.success && clsRes.data) {
        setClasses((clsRes.data as { classes: ClassType[] }).classes || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [classFilter, showClassFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group entries by day
  const dayMap = new Map<number, TimetableEntry[]>();
  entries.forEach(e => {
    const list = dayMap.get(e.day_of_week) || [];
    list.push(e);
    dayMap.set(e.day_of_week, list);
  });

  // Sorted unique days
  const days = Array.from(dayMap.keys()).sort((a, b) => a - b);

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
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Weekly Timetable</h1>
            <p className="text-muted-foreground text-sm">View class schedules and period timings.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {showClassFilter && (
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {showClassFilter && classFilter !== "all" && (
              <Button onClick={() => setShowManage(true)} className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md">
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Timetable
              </Button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" />
            <span className="text-sm text-muted-foreground">Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent/20 border border-accent/40" />
            <span className="text-sm text-muted-foreground">Lab</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted border border-muted-foreground/20" />
            <span className="text-sm text-muted-foreground">Free / No Class</span>
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
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold">No Timetable Entries</h3>
            <p className="text-muted-foreground text-sm mt-1">No schedule found for the selected class.</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {/* Mobile View — cards per day */}
            <div className="md:hidden space-y-4">
              {days.map(dayNum => {
                const dayEntries = (dayMap.get(dayNum) || []).sort((a, b) => a.period_number - b.period_number);
                return (
                  <Card key={dayNum} className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{DAY_NAMES[dayNum] || `Day ${dayNum}`}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dayEntries.map(entry => (
                        <div key={entry.id} className={`p-3 rounded-lg border ${getPeriodColor(entry)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{entry.subject_name || "—"}</span>
                            <Badge variant="outline" className="text-xs">P{entry.period_number}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm opacity-80">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {entry.start_time?.slice(0, 5)} – {entry.end_time?.slice(0, 5)}
                            </span>
                            {entry.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
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
              <Card className="shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-semibold text-muted-foreground">Period</th>
                        {days.map(d => (
                          <th key={d} className="text-left p-4 font-semibold text-muted-foreground min-w-[150px]">
                            {DAY_NAMES[d] || `Day ${d}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allPeriods.map(pNum => (
                        <tr key={pNum} className="border-b last:border-0">
                          <td className="p-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Period {pNum}
                          </td>
                          {days.map(d => {
                            const entry = (dayMap.get(d) || []).find(e => e.period_number === pNum);
                            return (
                              <td key={d} className="p-2">
                                <div className={`p-3 rounded-lg border ${getPeriodColor(entry)} h-full`}>
                                  {entry ? (
                                    <>
                                      <div className="font-medium text-sm">{entry.subject_name || "—"}</div>
                                      {entry.teacher_name && (
                                        <div className="text-xs opacity-70 mt-1">{entry.teacher_name}</div>
                                      )}
                                      <div className="flex items-center gap-2 mt-1 text-xs opacity-60">
                                        <span>{entry.start_time?.slice(0, 5)} – {entry.end_time?.slice(0, 5)}</span>
                                        {entry.room && (
                                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{entry.room}</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">—</div>
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
