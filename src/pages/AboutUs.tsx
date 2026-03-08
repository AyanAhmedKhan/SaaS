import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4 py-20">
      <div className="max-w-3xl mx-auto rounded-3xl border border-border/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-8 md:p-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">About Us</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          EduYantra is a moderns school management platform built to simplify academics, operations, and communication for institutions of every size.
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
