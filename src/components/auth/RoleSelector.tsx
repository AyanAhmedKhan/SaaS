import { GraduationCap, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleSelectorProps {
  onSelectRole: (role: 'student' | 'parent' | 'staff') => void;
}

const roles = [
  {
    id: 'student' as const,
    label: 'I am a Student',
    description: 'Access your classes, assignments & results',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-cyan-500',
    glowColor: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
    borderHover: 'hover:border-blue-400/60',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-400',
  },
  {
    id: 'parent' as const,
    label: 'I am a Parent',
    description: 'Track your child\'s progress & attendance',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-500',
    glowColor: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    borderHover: 'hover:border-emerald-400/60',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-400',
  },
  {
    id: 'staff' as const,
    label: 'Staff / Admin',
    description: 'Teachers & administrators portal',
    icon: ShieldCheck,
    gradient: 'from-violet-500 to-purple-500',
    glowColor: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]',
    borderHover: 'hover:border-violet-400/60',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-400',
  },
];

export default function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/80 to-emerald-50/60 dark:from-slate-950 dark:via-blue-950/20 dark:to-emerald-950/20">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl animate-blob-delay" />
        <div className="absolute -bottom-32 right-1/4 w-72 h-72 bg-violet-400/10 rounded-full blur-3xl animate-blob-delay-2" />
      </div>

      {/* Header with branding */}
      <div className="relative w-full py-8 px-4">
        <div className="max-w-md mx-auto flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25 animate-pulse-slow">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">EduYantra</h1>
            <p className="text-xs text-muted-foreground">School Management System</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2 animate-slide-in-up">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Welcome Back!
            </h2>
            <p className="text-muted-foreground text-base">
              Select your role to get started
            </p>
          </div>

          <div className="space-y-4">
            {roles.map((role, index) => (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-2xl transition-all duration-300",
                  "group relative overflow-hidden",
                  "glass border border-white/20 dark:border-white/5",
                  role.glowColor,
                  role.borderHover,
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "animate-slide-in-up"
                )}
                style={{ animationDelay: `${(index + 1) * 100}ms`, opacity: 0 }}
              >
                {/* Icon */}
                <div className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110",
                  role.iconBg
                )}>
                  <role.icon className="h-7 w-7 text-white" />
                </div>

                {/* Text */}
                <div className="relative flex-1 text-left">
                  <span className="block font-semibold text-lg text-foreground">
                    {role.label}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {role.description}
                  </span>
                </div>

                {/* Arrow */}
                <svg
                  className="w-5 h-5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-1.5 transition-all duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground/70 pt-2 animate-fade-in" style={{ animationDelay: '500ms', opacity: 0 }}>
            EduYantra — Secure Management Portal
          </p>
        </div>
      </div>
    </div>
  );
}
