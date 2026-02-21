import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { forgotPasswordApi } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [instituteCode, setInstituteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPasswordApi(email.trim(), instituteCode.trim() || undefined);
      setIsSent(true);
      toast.success("If the email exists, a reset link has been sent.");
    } catch (err) {
      // Still show success to prevent email enumeration
      setIsSent(true);
      toast.success("If the email exists, a reset link has been sent.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot Password</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <Card className="border-border/40 shadow-xl shadow-black/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Reset your password</CardTitle>
            <CardDescription>
              We'll send a password reset link to your email{" "}
              {process.env.NODE_ENV !== "production" && "and WhatsApp (if enabled)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Check your inbox!</p>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>.
                    The link expires in 1 hour.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setIsSent(false); setEmail(""); }}>
                    Try a different email
                  </Button>
                  <Link to="/">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instituteCode">
                    Institute Code <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="instituteCode"
                    type="text"
                    placeholder="e.g. INST001"
                    value={instituteCode}
                    onChange={(e) => setInstituteCode(e.target.value.toUpperCase())}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    If your email is used across multiple institutes, specify the code.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold shadow-lg shadow-violet-500/25"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reset Link
                    </>
                  )}
                </Button>

                <Link to="/">
                  <Button variant="ghost" className="w-full mt-2">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
