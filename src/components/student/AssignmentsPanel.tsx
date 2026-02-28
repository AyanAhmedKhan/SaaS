import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface AssignmentEntry {
  id: string;
  title: string;
  subject_name?: string;
  due_date: string;
  submission_status?: string | null;
}

interface AssignmentsPanelProps {
  assignments: AssignmentEntry[];
  onClick?: (id: string) => void;
}

type Status = "pending" | "submitted" | "late";

const statusConfig: Record<Status, { icon: typeof AlertCircle; color: string; label: string }> = {
  pending: { icon: AlertCircle, color: "bg-warning/10 text-warning-foreground border-warning/30", label: "Pending" },
  submitted: { icon: CheckCircle2, color: "bg-success/10 text-success border-success/30", label: "Done" },
  late: { icon: Clock, color: "bg-destructive/10 text-destructive border-destructive/30", label: "Late" },
};

function mapStatus(submissionStatus?: string | null, dueDate?: string): Status {
  if (submissionStatus === "submitted" || submissionStatus === "graded") return "submitted";
  if (dueDate && new Date(dueDate) < new Date()) return "late";
  return "pending";
}

export function AssignmentsPanel({ assignments, onClick }: AssignmentsPanelProps) {
  return (
    <Card className="shadow-card border-border/40">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-lg font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
        {assignments.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No upcoming assignments.</p>
        ) : (
          assignments.map((a) => {
            const status = mapStatus(a.submission_status, a.due_date);
            const cfg = statusConfig[status];
            const StatusIcon = cfg.icon;
            return (
              <div
                key={a.id}
                onClick={onClick ? () => onClick(a.id) : undefined}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card transition-all ${onClick ? 'hover:bg-muted/30 cursor-pointer active:scale-[0.99]' : ''}`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <StatusIcon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${status === "submitted" ? "text-green-600" : status === "late" ? "text-destructive" : "text-amber-500"
                    }`} />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-xs sm:text-sm truncate">{a.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {a.subject_name || "General"} · Due {new Date(a.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[9px] sm:text-xs shrink-0 ml-2 ${cfg.color}`}>
                  {cfg.label}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
