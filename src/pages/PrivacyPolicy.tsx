import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4 py-20">
      <div className="max-w-3xl mx-auto rounded-3xl border border-border/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-8 md:p-12">
        <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground leading-relaxed">
          We collect only the data required to deliver school operations, and we process it with strict access control and encryption safeguards.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
