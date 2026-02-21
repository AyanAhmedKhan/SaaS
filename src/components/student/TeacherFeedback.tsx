import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface FeedbackItem {
  id: number;
  teacher: string;
  subject: string;
  remark: string;
  date: string;
}

const feedbackItems: FeedbackItem[] = [
  { id: 1, teacher: "Mr. Sharma", subject: "Mathematics", remark: "Excellent improvement in calculus. Keep practicing integration problems.", date: "Feb 8, 2025" },
  { id: 2, teacher: "Dr. Patel", subject: "Physics", remark: "Needs to focus more on numerical problem-solving. Concepts are clear.", date: "Feb 5, 2025" },
  { id: 3, teacher: "Mrs. Gupta", subject: "English", remark: "Good essay writing skills. Work on grammar accuracy in formal letters.", date: "Feb 3, 2025" },
];

export function TeacherFeedback() {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Teacher Remarks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {feedbackItems.map((item) => (
          <div key={item.id} className="p-3 rounded-lg border bg-card space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground text-sm">{item.teacher}</p>
              <p className="text-xs text-muted-foreground">{item.date}</p>
            </div>
            <p className="text-xs text-muted-foreground">{item.subject}</p>
            <p className="text-sm text-foreground/80">{item.remark}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
