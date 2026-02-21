import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, ArrowLeft, User, Lock, Smartphone, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StudentLoginProps {
  onBack: () => void;
}

type LoginMethod = 'credentials' | 'otp';

export default function StudentLogin({ onBack }: StudentLoginProps) {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('credentials');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !password.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(studentId, password, 'student');
      if (success) {
        toast.success('Welcome back!', { description: 'Logged in as Student' });
        navigate('/dashboard');
      } else {
        toast.error('Login failed', { description: 'Invalid Student ID or Password' });
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    setIsLoading(true);
    // Simulate OTP send
    await new Promise(resolve => setTimeout(resolve, 1000));
    setOtpSent(true);
    setIsLoading(false);
    toast.success('OTP sent!', { description: `OTP sent to +91 ${mobileNumber}` });
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      toast.error('Please enter a valid OTP');
      return;
    }

    setIsLoading(true);
    try {
      // For demo, accept any 4-6 digit OTP
      const success = await login(mobileNumber, 'demo123', 'student');
      if (success) {
        toast.success('Welcome back!', { description: 'Logged in as Student' });
        navigate('/dashboard');
      } else {
        toast.error('Verification failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-cyan-950/20">
      {/* Header */}
      <div className="w-full py-4 px-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 pr-9">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">EduYantra</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md space-y-6 animate-slide-in-up">
          {/* Title */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium mb-2">
              <GraduationCap className="h-4 w-4" />
              Student Portal
            </div>
            <h2 className="text-2xl font-bold text-foreground">Student Login</h2>
            <p className="text-muted-foreground text-sm">Access your classes, assignments & results</p>
          </div>

          {/* Login Method Toggle */}
          <div className="flex gap-2 p-1 bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm">
            <button
              type="button"
              onClick={() => { setLoginMethod('credentials'); setOtpSent(false); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                loginMethod === 'credentials'
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Lock className="h-4 w-4" />
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('otp')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                loginMethod === 'otp'
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="h-4 w-4" />
              OTP
            </button>
          </div>

          {/* Login Form Card */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-border shadow-xl shadow-blue-500/5 p-6">
            {loginMethod === 'credentials' ? (
              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-sm font-medium">Student ID / Roll Number</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="Enter your Student ID"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>

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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Forgot Password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/25"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                  ) : (
                    'Login as Student'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91</span>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="Enter mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-12 h-12 rounded-xl"
                      maxLength={10}
                      disabled={otpSent}
                    />
                  </div>
                </div>

                {!otpSent ? (
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/25"
                    disabled={isLoading || mobileNumber.length < 10}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</>
                    ) : (
                      'Send OTP'
                    )}
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-sm font-medium">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="h-12 rounded-xl text-center text-lg tracking-widest font-mono"
                        maxLength={6}
                      />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Didn't receive OTP?</span>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Resend
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/25"
                      disabled={isLoading || otp.length < 4}
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                      ) : (
                        'Verify & Login'
                      )}
                    </Button>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Demo hint */}
          <p className="text-center text-xs text-muted-foreground">
            Demo: Any ID + <code className="bg-muted px-1.5 py-0.5 rounded">demo123</code> or any OTP
          </p>
        </div>
      </div>
    </div>
  );
}
