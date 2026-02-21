import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, ArrowLeft, User, Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const roles = [
    { id: 'student' as UserRole, label: 'Student', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-500' },
    { id: 'parent' as UserRole, label: 'Parent', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-500' },
    { id: 'teacher' as UserRole, label: 'Teacher', icon: ShieldCheck, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-violet-500' },
];

export default function Signup() {
    const [selectedRole, setSelectedRole] = useState<UserRole>('student');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password.trim()) {
            toast.error('Please fill all fields');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            const success = await register(name, email, password, selectedRole);
            if (success) {
                toast.success('Account created successfully!', { description: `Welcome, ${name}!` });
                navigate('/dashboard');
            } else {
                toast.error('Registration failed', { description: 'Email might already be in use.' });
            }
        } catch {
            toast.error('An error occurred during registration.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/80 to-emerald-50/60 dark:from-slate-950 dark:via-blue-950/20 dark:to-emerald-950/20">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl animate-blob-delay" />
            </div>

            {/* Header */}
            <div className="relative w-full py-4 px-4">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <Link
                        to="/"
                        className="p-2.5 rounded-xl glass hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <div className="flex-1 flex items-center justify-center gap-2 pr-9">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
                            <UserPlus className="h-5 w-5 text-white" />
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
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">Create an Account</h2>
                        <p className="text-muted-foreground text-sm">Join EduYantra to manage your school life</p>
                    </div>

                    {/* Signup Form — Glass Card */}
                    <div className="glass rounded-2xl shadow-xl shadow-primary/5 p-6 animate-scale-in" style={{ animationDelay: '100ms', opacity: 0 }}>
                        <form onSubmit={handleSignup} className="space-y-5">

                            {/* Role Selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">I am a...</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {roles.map((role) => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setSelectedRole(role.id)}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl border-2 transition-all duration-300",
                                                selectedRole === role.id
                                                    ? cn(role.border, role.bg, role.color, "shadow-sm scale-[1.02]")
                                                    : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <role.icon className="h-5 w-5" />
                                            <span className="font-medium text-xs">{role.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10 h-12 rounded-xl border-border/50 focus:border-primary/50 transition-all duration-200"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-12 rounded-xl border-border/50 focus:border-primary/50 transition-all duration-200"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-12 rounded-xl border-border/50 focus:border-primary/50 transition-all duration-200"
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

                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
                                ) : (
                                    'Sign Up'
                                )}
                            </Button>
                        </form>
                    </div>

                    <div className="text-center animate-fade-in" style={{ animationDelay: '300ms', opacity: 0 }}>
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
