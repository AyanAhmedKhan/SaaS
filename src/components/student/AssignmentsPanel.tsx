import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface Assignment {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  status: "pending" | "submitted" | "late";
}

const assignments: Assignment[] = [
  { id: 1, title: "Trigonometry Problems Set 5", subject: "Mathematics", dueDate: "Feb 15, 2025", status: "pending" },
  { id: 2, title: "Newton's Laws Lab Report", subject: "Physics", dueDate: "Feb 12, 2025", status: "submitted" },
  { id: 3, title: "Book Review - The Guide", subject: "English", dueDate: "Feb 18, 2025", status: "pending" },
  { id: 4, title: "Organic Chemistry Worksheet", subject: "Chemistry", dueDate: "Feb 10, 2025", status: "late" },
  { id: 5, title: "Ecosystem Diagram", subject: "Biology", dueDate: "Feb 20, 2025", status: "pending" },
];

const statusConfig = {
  pending: { icon: AlertCircle, color: "bg-warning/10 text-warning-foreground border-warning/30", label: "Pending" },
  submitted: { icon: CheckCircle2, color: "bg-success/10 text-success border-success/30", label: "Submitted" },
  late: { icon: Clock, color: "bg-destructive/10 text-destructive border-destructive/30", label: "Late" },
};

export function AssignmentsPanel() {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Assignments & Homework
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((a) => {
          const cfg = statusConfig[a.status];
          const StatusIcon = cfg.icon;
          return (
            <div
              key={a.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon className={`h-5 w-5 shrink-0 ${
                  a.status === "submitted" ? "text-success" : a.status === "late" ? "text-destructive" : "text-warning"
                }`} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.subject} - Due: {a.dueDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                  {cfg.label}
                </Badge>
                <Button variant="ghost" size="sm" className="text-xs hidden sm:inline-flex" disabled>
                  View Assignment
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
