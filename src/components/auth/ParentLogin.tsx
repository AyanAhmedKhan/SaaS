import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ParentLoginProps {
  onBack: () => void;
}

export default function ParentLogin({ onBack }: ParentLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instituteCode, setInstituteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    if (!instituteCode.trim()) {
      toast.error('Institute code is required');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password, instituteCode);
      if (success) {
        toast.success('Welcome!', { description: 'Logged in as Parent' });
        navigate('/dashboard');
      } else {
        toast.error('Login failed', { description: 'Invalid email, password, or institute code' });
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 dark:from-slate-950 dark:via-emerald-950/30 dark:to-teal-950/20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl animate-blob-delay" />
      </div>

      {/* Header */}
      <div className="relative w-full py-4 px-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 pr-9">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">EduYantra</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md space-y-6 animate-slide-in-up">
          {/* Title */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-2">
              <Users className="h-4 w-4" />
              Parent Portal
            </div>
            <h2 className="text-2xl font-bold text-foreground">Parent Login</h2>
            <p className="text-muted-foreground text-sm">Track your child's progress & attendance</p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              Secure encrypted login
            </span>
          </div>

          {/* Login Form Card */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-border shadow-xl shadow-emerald-500/5 p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Institute Code */}
              <div className="space-y-2">
                <Label htmlFor="instituteCode" className="text-sm font-medium">Institute Code</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="instituteCode"
                    type="text"
                    placeholder="e.g. SPRING01"
                    value={instituteCode}
                    onChange={(e) => setInstituteCode(e.target.value.toUpperCase())}
                    className="pl-10 h-12 rounded-xl uppercase tracking-wider"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the institute code provided by your child's school
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-xl"
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

              {/* Forgot Password */}
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Forgot Password?
                </Link>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...</>
                ) : (
                  'Login as Parent'
                )}
              </Button>
            </form>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <span>•</span>
              <span>Trusted by 500+ Schools</span>
            </div>
          </div>

          {/* Demo hint - only visible in development */}
          {import.meta.env.DEV && (
            <p className="text-center text-xs text-muted-foreground">
              Demo: ramesh.sharma@gmail.com / demo123 / SPRING01
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
