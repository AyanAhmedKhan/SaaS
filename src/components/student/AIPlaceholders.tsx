import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, BookOpen } from "lucide-react";

function PlaceholderCard({ title, icon: Icon, description }: { title: string; icon: React.ElementType; description: string }) {
  return (
    <Card className="shadow-card opacity-60">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
          <div className="p-3 rounded-full bg-muted">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
            Coming Soon
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function AIPlaceholders() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PlaceholderCard
        title="Performance Insights"
        icon={Sparkles}
        description="AI-powered analysis of your academic performance trends and patterns."
      />
      <PlaceholderCard
        title="Personalized Study Recommendations"
        icon={BookOpen}
        description="Smart study plans tailored to your strengths and areas for improvement."
      />
    </div>
  );
}
