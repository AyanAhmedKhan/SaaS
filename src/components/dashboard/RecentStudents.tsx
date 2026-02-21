import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface Student {
  id: string | number;
  name: string;
  avatar?: string;
  class?: string;
  class_name?: string;
  section?: string;
  attendance?: number;
  roll_number?: string;
  enrollment_date?: string;
}

interface RecentStudentsProps {
  students?: Student[];
}

export function RecentStudents({ students }: RecentStudentsProps) {
  const displayStudents = (students || []).slice(0, 5);

  const getAttendanceColor = (attendance: number) => {
    if (attendance >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (attendance >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-red-500";
  };

  const getProgressColor = (attendance: number) => {
    if (attendance >= 90) return "bg-emerald-500";
    if (attendance >= 75) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="shadow-card border-border/50 hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold tracking-tight">Recent Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayStudents.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No students to display
          </div>
        ) : (
          displayStudents.map((student, index) => (
            <div
              key={student.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-all duration-200 cursor-default animate-slide-in-up"
              style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
            >
              <Avatar className="h-10 w-10 ring-2 ring-border/50">
                <AvatarImage src={student.avatar} />
                <AvatarFallback className="bg-primary/8 text-primary font-semibold text-sm">
                  {student.name?.split(' ').map(n => n[0]).join('') || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{student.name}</p>
                  {(student.class || student.class_name) && (
                    <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold">
                      {student.class || student.class_name}{student.section ? ` - ${student.section}` : ''}
                    </Badge>
                  )}
                </div>
                {student.attendance !== undefined && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">Attendance</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", getProgressColor(student.attendance))}
                        style={{ width: `${student.attendance}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-semibold tabular-nums", getAttendanceColor(student.attendance))}>
                      {student.attendance}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
