import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Smartphone, User, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ParentLoginProps {
  onBack: () => void;
}

export default function ParentLogin({ onBack }: ParentLoginProps) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showStudentId, setShowStudentId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
      const success = await login(mobileNumber, 'demo123', 'parent');
      if (success) {
        toast.success('Welcome!', { description: 'Logged in as Parent' });
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 dark:from-slate-950 dark:via-emerald-950/30 dark:to-teal-950/20">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
              <Users className="h-5 w-5 text-white" />
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
              Secure OTP-based login
            </span>
          </div>

          {/* Login Form Card */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-border shadow-xl shadow-emerald-500/5 p-6">
            <form onSubmit={handleOtpLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-sm font-medium">Registered Mobile Number</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91</span>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-12 h-12 rounded-xl"
                    maxLength={10}
                    disabled={otpSent}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the mobile number registered with your child's school
                </p>
              </div>

              {!otpSent ? (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25"
                  disabled={isLoading || mobileNumber.length < 10}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Send OTP
                    </>
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
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Resend
                      </button>
                    </div>
                  </div>

                  {/* Optional Student ID linking */}
                  <div className="pt-2">
                    {!showStudentId ? (
                      <button
                        type="button"
                        onClick={() => setShowStudentId(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Link to child's Student ID (optional)
                      </button>
                    ) : (
                      <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <Label htmlFor="studentId" className="text-sm font-medium">Child's Student ID</Label>
                        <Input
                          id="studentId"
                          type="text"
                          placeholder="Enter Student ID / Roll Number"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          className="h-10 rounded-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                          This helps link your account to your child
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25"
                    disabled={isLoading || otp.length < 4}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                    ) : (
                      'Login as Parent'
                    )}
                  </Button>
                </>
              )}
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

          {/* Demo hint */}
          <p className="text-center text-xs text-muted-foreground">
            Demo: Any mobile number + any 4-6 digit OTP
          </p>
        </div>
      </div>
    </div>
  );
}
