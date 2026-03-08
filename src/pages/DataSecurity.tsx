import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function DataSecurity() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4 py-20">
      <div className="max-w-3xl mx-auto rounded-3xl border border-border/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-8 md:p-12">
        <h1 className="text-3xl font-bold text-foreground mb-6">Data Security</h1>
        <p className="text-muted-foreground leading-relaxed">
          EduYantra uses secure authentication, encrypted transport, role-based access, and audit-ready controls to protect institutional data.
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
