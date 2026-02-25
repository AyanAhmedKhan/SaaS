import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    UserPlus, ArrowLeft, ArrowRight, User, Lock, Mail, Eye, EyeOff, Loader2,
    ShieldCheck, GraduationCap, Users, Building2, CheckCircle2, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ───────────────────────── Role Configs ───────────────────────── */
const roles = [
    {
        id: 'student' as UserRole,
        label: 'I am a Student',
        description: 'Join your class, view assignments & results',
        icon: GraduationCap,
        gradient: 'from-blue-500 to-cyan-500',
        glowColor: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
        borderHover: 'hover:border-blue-400/60',
        iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-400',
        pageBg: 'from-blue-50 via-cyan-50 to-slate-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-cyan-950/20',
        blobColor: 'bg-blue-400/10',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
        badgeText: 'text-blue-700 dark:text-blue-300',
        accentColor: 'text-blue-500',
        focusColor: 'focus:border-blue-400',
        btnGradient: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
        btnShadow: 'shadow-blue-500/25 hover:shadow-blue-500/30',
    },
    {
        id: 'parent' as UserRole,
        label: 'I am a Parent',
        description: "Track your child's progress & attendance",
        icon: Users,
        gradient: 'from-emerald-500 to-teal-500',
        glowColor: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
        borderHover: 'hover:border-emerald-400/60',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-400',
        pageBg: 'from-emerald-50 via-teal-50/80 to-slate-50 dark:from-slate-950 dark:via-emerald-950/30 dark:to-teal-950/20',
        blobColor: 'bg-emerald-400/10',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        accentColor: 'text-emerald-500',
        focusColor: 'focus:border-emerald-400',
        btnGradient: 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
        btnShadow: 'shadow-emerald-500/25 hover:shadow-emerald-500/30',
    },
    {
        id: 'institute_admin' as UserRole,
        label: 'Staff / Admin',
        description: 'Register your institute or join as staff',
        icon: ShieldCheck,
        gradient: 'from-violet-500 to-purple-500',
        glowColor: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]',
        borderHover: 'hover:border-violet-400/60',
        iconBg: 'bg-gradient-to-br from-violet-500 to-purple-400',
        pageBg: 'from-violet-50 via-purple-50/80 to-slate-50 dark:from-slate-950 dark:via-violet-950/30 dark:to-purple-950/20',
        blobColor: 'bg-violet-400/10',
        badgeBg: 'bg-violet-100/80 dark:bg-violet-900/40',
        badgeText: 'text-violet-700 dark:text-violet-300',
        accentColor: 'text-violet-500',
        focusColor: 'focus:border-violet-400',
        btnGradient: 'from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600',
        btnShadow: 'shadow-violet-500/25 hover:shadow-violet-500/30',
    },
];

/* ─────────────────────── Password strength ─────────────────────── */
function getPasswordStrength(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
    return { label: 'Excellent', color: 'bg-green-500', width: '100%' };
}

/* ═════════════════════════════════════════════════════════════════
   STEP 1 — Role Selector
   ═════════════════════════════════════════════════════════════════ */
function SignupRoleSelector({ onSelectRole }: { onSelectRole: (role: UserRole) => void }) {
    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/80 to-emerald-50/60 dark:from-slate-950 dark:via-blue-950/20 dark:to-emerald-950/20">
            {/* Animated background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute top-1/3 -left-32 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl animate-blob-delay" />
                <div className="absolute -bottom-32 right-1/4 w-72 h-72 bg-violet-400/10 rounded-full blur-3xl animate-blob-delay-2" />
            </div>

            {/* Header */}
            <div className="relative w-full py-8 px-4">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <Link
                        to="/"
                        className="p-2.5 rounded-xl glass hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <div className="flex-1 flex items-center justify-center gap-3 pr-9">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25 animate-pulse-slow">
                            <UserPlus className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">EduYantra</h1>
                            <p className="text-xs text-muted-foreground">Create Account</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="relative flex-1 flex items-center justify-center p-4 pb-12">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-2 animate-slide-in-up">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-1">
                            <Sparkles className="h-4 w-4" />
                            Get Started
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                            Join EduYantra
                        </h2>
                        <p className="text-muted-foreground text-base">
                            Select your role to create an account
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
                                <div className={cn(
                                    "relative flex h-14 w-14 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110",
                                    role.iconBg
                                )}>
                                    <role.icon className="h-7 w-7 text-white" />
                                </div>
                                <div className="relative flex-1 text-left">
                                    <span className="block font-semibold text-lg text-foreground">{role.label}</span>
                                    <span className="block text-sm text-muted-foreground">{role.description}</span>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-1.5 transition-all duration-300" />
                            </button>
                        ))}
                    </div>

                    <div className="text-center pt-2 animate-fade-in" style={{ animationDelay: '500ms', opacity: 0 }}>
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═════════════════════════════════════════════════════════════════
   STEP 2 — Role-Specific Signup Form
   ═════════════════════════════════════════════════════════════════ */
function SignupForm({ roleId, onBack }: { roleId: UserRole; onBack: () => void }) {
    const roleConfig = roles.find(r => r.id === roleId)!;
    const isAdmin = roleId === 'institute_admin';

    const [step, setStep] = useState(1); // Step 1: Institute, Step 2: Personal
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [instituteName, setInstituteName] = useState('');
    const [instituteCode, setInstituteCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();
    const pwStrength = getPasswordStrength(password);

    const handleNext = () => {
        if (isAdmin && !instituteName.trim()) {
            toast.error('Institute name is required');
            return;
        }
        if (!isAdmin && !instituteCode.trim()) {
            toast.error('Institute code is required');
            return;
        }
        setStep(2);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password.trim()) {
            toast.error('Please fill all fields');
            return;
        }
        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const success = await register({
                name,
                email,
                password,
                role: roleId,
                ...(isAdmin ? { institute_name: instituteName } : { institute_code: instituteCode }),
            });
            if (success) {
                toast.success('Account created successfully!', {
                    description: `Welcome to EduYantra, ${name}!`,
                    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
                });
                navigate('/dashboard');
            } else {
                toast.error('Registration failed', { description: 'Email might already be in use or invalid institute code.' });
            }
        } catch {
            toast.error('An error occurred during registration.');
        } finally {
            setIsLoading(false);
        }
    };

    const RoleIcon = roleConfig.icon;

    return (
        <div className={cn(
            "min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br",
            roleConfig.pageBg
        )}>
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className={cn("absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl animate-blob", roleConfig.blobColor)} />
                <div className={cn("absolute bottom-1/4 -left-24 w-64 h-64 rounded-full blur-3xl animate-blob-delay", roleConfig.blobColor)} />
            </div>

            {/* Header */}
            <div className="relative w-full py-4 px-4">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button
                        onClick={step === 1 ? onBack : () => setStep(1)}
                        className="p-2.5 rounded-xl glass hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 pr-9">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-lg", roleConfig.iconBg)}>
                            <RoleIcon className="h-5 w-5 text-white" />
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
                        <div className={cn(
                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-2 backdrop-blur-sm",
                            roleConfig.badgeBg, roleConfig.badgeText
                        )}>
                            <RoleIcon className="h-4 w-4" />
                            {isAdmin ? 'Admin Registration' : `${roleId === 'student' ? 'Student' : 'Parent'} Registration`}
                        </div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">
                            {step === 1 ? 'Institute Details' : 'Your Information'}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {step === 1
                                ? (isAdmin ? 'Register your institute to get started' : 'Enter your institute code to join')
                                : 'Create your personal account'
                            }
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-2">
                        <div className={cn(
                            "flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all duration-300",
                            step >= 1
                                ? cn("bg-gradient-to-br text-white", roleConfig.gradient)
                                : "bg-muted text-muted-foreground"
                        )}>
                            {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                        </div>
                        <div className={cn(
                            "h-0.5 w-12 rounded-full transition-all duration-500",
                            step >= 2
                                ? cn("bg-gradient-to-r", roleConfig.gradient)
                                : "bg-border"
                        )} />
                        <div className={cn(
                            "flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all duration-300",
                            step >= 2
                                ? cn("bg-gradient-to-br text-white", roleConfig.gradient)
                                : "bg-muted text-muted-foreground"
                        )}>
                            2
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="glass rounded-2xl shadow-xl p-6 animate-scale-in" style={{ animationDelay: '100ms', opacity: 0 }}>
                        {step === 1 ? (
                            /* ── STEP 1: Institute Details ── */
                            <div className="space-y-5">
                                {isAdmin ? (
                                    /* Admin: New Institute */
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="instituteName" className="text-sm font-medium">Institute Name</Label>
                                            <div className="relative group">
                                                <Building2 className={cn(
                                                    "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors",
                                                    `group-focus-within:${roleConfig.accentColor}`
                                                )} />
                                                <Input
                                                    id="instituteName"
                                                    type="text"
                                                    placeholder="e.g. Springfield Academy"
                                                    value={instituteName}
                                                    onChange={(e) => setInstituteName(e.target.value)}
                                                    className={cn("pl-10 h-12 rounded-xl border-border/50 transition-all duration-200", roleConfig.focusColor)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="instituteCodeOptional" className="text-sm font-medium">
                                                Institute Code <span className="text-muted-foreground font-normal">(optional)</span>
                                            </Label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="instituteCodeOptional"
                                                    type="text"
                                                    placeholder="Auto-generated if blank"
                                                    value={instituteCode}
                                                    onChange={(e) => setInstituteCode(e.target.value.toUpperCase())}
                                                    className={cn("pl-10 h-12 rounded-xl border-border/50 uppercase tracking-wider transition-all duration-200", roleConfig.focusColor)}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Sparkles className="h-3 w-3" />
                                                A unique code will be generated for your institute
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Student / Parent: Join Institute */
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="instituteCode" className="text-sm font-medium">Institute Code</Label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="instituteCode"
                                                    type="text"
                                                    placeholder="e.g. SPRING01"
                                                    value={instituteCode}
                                                    onChange={(e) => setInstituteCode(e.target.value.toUpperCase())}
                                                    className={cn("pl-10 h-12 rounded-xl border-border/50 uppercase tracking-wider transition-all duration-200", roleConfig.focusColor)}
                                                    autoFocus
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Get this from your school / institute administrator
                                            </p>
                                        </div>

                                        {/* Visual info card */}
                                        <div className={cn(
                                            "flex items-start gap-3 p-4 rounded-xl border border-border/50",
                                            roleConfig.badgeBg
                                        )}>
                                            <div className={cn("flex-shrink-0 p-2 rounded-lg", roleConfig.iconBg)}>
                                                <Building2 className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Why do I need this?</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    The institute code links your account to your school. Ask your {roleId === 'parent' ? "child's school" : 'school'} admin for the code.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    className={cn(
                                        "w-full h-12 rounded-xl text-white font-semibold shadow-lg transition-all duration-300",
                                        "hover:scale-[1.01] active:scale-[0.99] hover:shadow-xl",
                                        `bg-gradient-to-r ${roleConfig.btnGradient} ${roleConfig.btnShadow}`
                                    )}
                                    disabled={isAdmin ? !instituteName.trim() : !instituteCode.trim()}
                                >
                                    Continue
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            /* ── STEP 2: Personal Information ── */
                            <form onSubmit={handleSignup} className="space-y-4">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Enter your full name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={cn("pl-10 h-12 rounded-xl border-border/50 transition-all duration-200", roleConfig.focusColor)}
                                            autoFocus
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
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={cn("pl-10 h-12 rounded-xl border-border/50 transition-all duration-200", roleConfig.focusColor)}
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
                                            placeholder="Minimum 8 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={cn("pl-10 pr-10 h-12 rounded-xl border-border/50 transition-all duration-200", roleConfig.focusColor)}
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
                                    {/* Password strength bar */}
                                    {password.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", pwStrength.color)}
                                                    style={{ width: pwStrength.width }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Strength: <span className="font-medium">{pwStrength.label}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <Input
                                            id="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Re-enter your password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={cn(
                                                "pl-10 h-12 rounded-xl border-border/50 transition-all duration-200",
                                                roleConfig.focusColor,
                                                confirmPassword.length > 0 && password !== confirmPassword && "border-red-400 focus:border-red-400"
                                            )}
                                            required
                                        />
                                        {confirmPassword.length > 0 && password === confirmPassword && (
                                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                        )}
                                    </div>
                                    {confirmPassword.length > 0 && password !== confirmPassword && (
                                        <p className="text-xs text-red-500">Passwords do not match</p>
                                    )}
                                </div>

                                {/* Summary chip */}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                    <RoleIcon className="h-3.5 w-3.5" />
                                    <span>
                                        Signing up as <strong className="text-foreground">{roleId === 'institute_admin' ? 'Admin' : roleId === 'student' ? 'Student' : 'Parent'}</strong>
                                        {' '}&bull;{' '}
                                        {isAdmin ? instituteName : <span className="uppercase tracking-wider font-mono">{instituteCode}</span>}
                                    </span>
                                </div>

                                <Button
                                    type="submit"
                                    className={cn(
                                        "w-full h-12 rounded-xl text-white font-semibold shadow-lg transition-all duration-300",
                                        "hover:scale-[1.01] active:scale-[0.99] hover:shadow-xl",
                                        `bg-gradient-to-r ${roleConfig.btnGradient} ${roleConfig.btnShadow}`
                                    )}
                                    disabled={isLoading || !name.trim() || !email.trim() || password.length < 8 || password !== confirmPassword}
                                >
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
                                    ) : (
                                        <><UserPlus className="mr-2 h-4 w-4" /> Create Account</>
                                    )}
                                </Button>
                            </form>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center animate-fade-in" style={{ animationDelay: '300ms', opacity: 0 }}>
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═════════════════════════════════════════════════════════════════
   MAIN EXPORT — Multi-step Signup
   ═════════════════════════════════════════════════════════════════ */
export default function Signup() {
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

    if (selectedRole) {
        return <SignupForm roleId={selectedRole} onBack={() => setSelectedRole(null)} />;
    }

    return <SignupRoleSelector onSelectRole={setSelectedRole} />;
}
