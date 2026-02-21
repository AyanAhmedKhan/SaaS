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
}

type Status = "pending" | "submitted" | "late";

const statusConfig: Record<Status, { icon: typeof AlertCircle; color: string; label: string }> = {
  pending: { icon: AlertCircle, color: "bg-warning/10 text-warning-foreground border-warning/30", label: "Pending" },
  submitted: { icon: CheckCircle2, color: "bg-success/10 text-success border-success/30", label: "Submitted" },
  late: { icon: Clock, color: "bg-destructive/10 text-destructive border-destructive/30", label: "Late" },
};

function mapStatus(submissionStatus?: string | null, dueDate?: string): Status {
  if (submissionStatus === "submitted" || submissionStatus === "graded") return "submitted";
  if (dueDate && new Date(dueDate) < new Date()) return "late";
  return "pending";
}

export function AssignmentsPanel({ assignments }: AssignmentsPanelProps) {
  return (
    <Card className="shadow-card border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Assignments & Homework
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming assignments.</p>
        ) : (
          assignments.map((a) => {
            const status = mapStatus(a.submission_status, a.due_date);
            const cfg = statusConfig[status];
            const StatusIcon = cfg.icon;
            return (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon className={`h-5 w-5 shrink-0 ${
                    status === "submitted" ? "text-green-600" : status === "late" ? "text-destructive" : "text-amber-500"
                  }`} />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.subject_name || "General"} — Due: {new Date(a.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color}`}>
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
