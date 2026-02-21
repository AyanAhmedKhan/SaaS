import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, User, Lock, Eye, EyeOff, Loader2, BookOpen, Crown, School, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StaffLoginProps {
  onBack: () => void;
}

const staffRoles = [
  { id: 'super_admin' as UserRole, label: 'Super Admin', icon: Crown, color: 'from-red-500 to-rose-600' },
  { id: 'institute_admin' as UserRole, label: 'Admin', icon: School, color: 'from-violet-500 to-purple-600' },
  { id: 'class_teacher' as UserRole, label: 'Class Teacher', icon: BookOpen, color: 'from-blue-500 to-indigo-600' },
  { id: 'subject_teacher' as UserRole, label: 'Subject Teacher', icon: ShieldCheck, color: 'from-teal-500 to-cyan-600' },
];

export default function StaffLogin({ onBack }: StaffLoginProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('institute_admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instituteCode, setInstituteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const needsInstituteCode = selectedRole !== 'super_admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    if (needsInstituteCode && !instituteCode.trim()) {
      toast.error('Institute code is required');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password, needsInstituteCode ? instituteCode : undefined);
      if (success) {
        toast.success('Welcome back!', { description: `Logged in as ${selectedRole.replace(/_/g, ' ')}` });
        navigate('/dashboard');
      } else {
        toast.error('Login failed', { description: 'Invalid credentials or institute code' });
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50/80 to-slate-50 dark:from-slate-950 dark:via-violet-950/30 dark:to-purple-950/20">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl animate-blob-delay" />
      </div>

      {/* Header */}
      <div className="relative w-full py-4 px-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl glass hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 pr-9">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/25">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">EduYantra</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md space-y-6 animate-slide-in-up">
          {/* Title */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100/80 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-sm font-medium mb-2 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              Staff Portal
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Staff / Admin Login</h2>
            <p className="text-muted-foreground text-sm">Access the management dashboard</p>
          </div>

          {/* Login Form — Glass Card */}
          <div className="glass rounded-2xl shadow-xl shadow-violet-500/5 p-6 animate-scale-in" style={{ animationDelay: '100ms', opacity: 0 }}>
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  {staffRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all duration-300",
                        selectedRole === role.id
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 shadow-md shadow-violet-500/10 scale-[1.02]"
                          : "border-border/50 hover:border-violet-300 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <role.icon className="h-4 w-4" />
                      <span className="font-medium text-xs">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Institute Code — hidden for super_admin */}
              {needsInstituteCode && (
                <div className="space-y-2">
                  <Label htmlFor="instituteCode" className="text-sm font-medium">Institute Code</Label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-violet-500" />
                    <Input
                      id="instituteCode"
                      type="text"
                      placeholder="e.g. SPRING01"
                      value={instituteCode}
                      onChange={(e) => setInstituteCode(e.target.value.toUpperCase())}
                      className="pl-10 h-12 rounded-xl border-border/50 focus:border-violet-400 transition-all duration-200 uppercase tracking-wider"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-violet-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-border/50 focus:border-violet-400 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-violet-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-xl border-border/50 focus:border-violet-400 transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors">
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  'Login as Staff'
                )}
              </Button>
            </form>
          </div>

          {/* Demo hint */}
          <div className="text-center animate-fade-in" style={{ animationDelay: '300ms', opacity: 0 }}>
            <p className="text-xs text-muted-foreground/70">
              Demo: admin@springfield.edu + <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono">demo123</code> • Code: <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono">SPRING01</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
