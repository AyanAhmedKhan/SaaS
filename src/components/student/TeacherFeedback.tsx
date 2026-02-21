import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

interface RemarkEntry {
  id: string;
  teacher_name?: string;
  content: string;
  remark_type?: string;
  created_at?: string;
}

interface TeacherFeedbackProps {
  remarks: RemarkEntry[];
}

const typeColors: Record<string, string> = {
  appreciation: "bg-green-500/10 text-green-700 border-green-500/20",
  behavioral: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  general: "bg-primary/10 text-primary border-primary/20",
};

export function TeacherFeedback({ remarks }: TeacherFeedbackProps) {
  return (
    <Card className="shadow-card border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Teacher Remarks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {remarks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No remarks yet.</p>
        ) : (
          remarks.map((item) => (
            <div key={item.id} className="p-3 rounded-lg border bg-card space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground text-sm">{item.teacher_name || "Teacher"}</p>
                <div className="flex items-center gap-2">
                  {item.remark_type && item.remark_type !== "general" && (
                    <Badge variant="outline" className={`text-[10px] ${typeColors[item.remark_type] || ""}`}>
                      {item.remark_type}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                  </p>
                </div>
              </div>
              <p className="text-sm text-foreground/80">{item.content}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
