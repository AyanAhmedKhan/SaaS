import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Check, X, Sparkles, Shield, Users, GraduationCap,
    ArrowRight, Star, TrendingUp, Brain,
    Target, Flame, Activity, ChevronRight, Rocket, Crown, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { updateInstitute } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionPlan } from "@/types";

const SEEDED_PLANS: SubscriptionPlan[] = [
    {
        id: "plan_starter",
        slug: "starter",
        name: "Starter",
        tagline: "Best for small coaching centers",
        monthly_price: 2999,
        annual_price: 29990,
        max_students: 300,
        max_teachers: 25,
        max_admins: 3,
        max_classes: 20,
        features: [
            { text: "Student management", included: true },
            { text: "Attendance & notices", included: true },
            { text: "Basic fee tracking", included: true },
            { text: "Parent portal", included: true },
            { text: "AI analytics", included: false },
        ],
        is_default: true,
        is_active: true,
        sort_order: 1,
    },
    {
        id: "plan_professional",
        slug: "professional",
        name: "Professional",
        tagline: "Ideal for growing schools",
        monthly_price: 6999,
        annual_price: 69990,
        max_students: 1500,
        max_teachers: 120,
        max_admins: 12,
        max_classes: 80,
        features: [
            { text: "Everything in Starter", included: true, highlight: true },
            { text: "Advanced reports", included: true },
            { text: "Exam & grading workflows", included: true },
            { text: "Role-based permissions", included: true },
            { text: "Priority support", included: true },
        ],
        is_default: false,
        is_active: true,
        sort_order: 2,
    },
    {
        id: "plan_ai_pro",
        slug: "ai_pro",
        name: "AI Pro",
        tagline: "Smart automation for outcomes",
        monthly_price: 11999,
        annual_price: 119990,
        max_students: 5000,
        max_teachers: 350,
        max_admins: 40,
        max_classes: 250,
        features: [
            { text: "Everything in Professional", included: true, highlight: true },
            { text: "At-risk student prediction", included: true, highlight: true },
            { text: "Attendance anomaly alerts", included: true },
            { text: "Performance forecasting", included: true },
            { text: "Workload optimization", included: true },
        ],
        is_default: false,
        is_active: true,
        sort_order: 3,
    },
    {
        id: "plan_enterprise",
        slug: "enterprise",
        name: "Enterprise",
        tagline: "Custom scale for institutions",
        monthly_price: 24999,
        annual_price: 249990,
        max_students: 99999,
        max_teachers: 99999,
        max_admins: 99999,
        max_classes: 99999,
        features: [
            { text: "Everything in AI Pro", included: true, highlight: true },
            { text: "Dedicated account manager", included: true },
            { text: "Custom integrations", included: true },
            { text: "On-prem / private cloud options", included: true },
            { text: "SLA + 24x7 support", included: true },
        ],
        is_default: false,
        is_active: true,
        sort_order: 4,
    },
];

interface PlanFeature {
    text: string;
    included: boolean;
    highlight?: boolean;
}

interface PlanUI {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    monthlyPrice: number;
    annualPrice: number;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    glowColor: string;
    borderColor: string;
    bgAccent: string;
    iconBg: string;
    popular?: boolean;
    students: string;
    teachers: string;
    admins: string;
    features: PlanFeature[];
    cta: string;
}

function formatPrice(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function toDisplayLimit(value: number) {
    if (value >= 99999) return "Unlimited";
    return value.toLocaleString("en-IN");
}

function planVisuals(slug: string): Omit<PlanUI, "id" | "slug" | "name" | "tagline" | "monthlyPrice" | "annualPrice" | "students" | "teachers" | "admins" | "features"> {
    switch (slug) {
        case "starter":
            return {
                icon: Rocket,
                gradient: "from-emerald-500 to-green-600",
                glowColor: "hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]",
                borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
                bgAccent: "bg-emerald-500/5",
                iconBg: "bg-gradient-to-br from-emerald-500 to-green-600",
                cta: "Get Started",
            };
        case "professional":
            return {
                icon: Shield,
                gradient: "from-blue-500 to-indigo-600",
                glowColor: "hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]",
                borderColor: "border-blue-500/20 hover:border-blue-500/40",
                bgAccent: "bg-blue-500/5",
                iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
                cta: "Upgrade Now",
            };
        case "ai_pro":
            return {
                icon: Brain,
                gradient: "from-orange-500 to-amber-600",
                glowColor: "hover:shadow-[0_0_40px_rgba(249,115,22,0.2)]",
                borderColor: "border-orange-500/30 hover:border-orange-500/50",
                bgAccent: "bg-orange-500/5",
                iconBg: "bg-gradient-to-br from-orange-500 to-amber-600",
                cta: "Start AI Pro Trial",
            };
        case "enterprise":
            return {
                icon: Crown,
                gradient: "from-violet-500 to-purple-600",
                glowColor: "hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]",
                borderColor: "border-violet-500/20 hover:border-violet-500/40",
                bgAccent: "bg-violet-500/5",
                iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
                cta: "Contact Sales",
            };
        default:
            return {
                icon: Sparkles,
                gradient: "from-zinc-500 to-slate-600",
                glowColor: "hover:shadow-[0_0_30px_rgba(113,113,122,0.15)]",
                borderColor: "border-border hover:border-border/80",
                bgAccent: "bg-muted/40",
                iconBg: "bg-gradient-to-br from-zinc-500 to-slate-600",
                cta: "Choose Plan",
            };
    }
}

function mapPlanToUI(plan: SubscriptionPlan): PlanUI {
    const visual = planVisuals(plan.slug);
    return {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        tagline: plan.tagline || "Flexible plan for your institute",
        monthlyPrice: plan.monthly_price,
        annualPrice: plan.annual_price,
        popular: plan.slug === "ai_pro",
        students: toDisplayLimit(plan.max_students),
        teachers: toDisplayLimit(plan.max_teachers),
        admins: toDisplayLimit(plan.max_admins),
        features: Array.isArray(plan.features) ? plan.features : [],
        ...visual,
    };
}

function PlanCard({
    plan,
    isAnnual,
    currentPlan,
    index,
    isUpdating,
    onChoose,
}: {
    plan: PlanUI;
    isAnnual: boolean;
    currentPlan?: string;
    index: number;
    isUpdating: boolean;
    onChoose: (slug: string) => void;
}) {
    const price = isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
    const totalAnnual = plan.annualPrice;
    const isCurrentPlan = currentPlan === plan.slug;
    const PlanIcon = plan.icon;

    return (
        <div
            className={cn(
                "relative flex flex-col rounded-3xl border transition-all duration-500 group",
                "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl",
                plan.borderColor,
                plan.glowColor,
                plan.popular
                    ? "scale-[1.02] lg:scale-105 shadow-2xl ring-2 ring-orange-500/30 z-10"
                    : "hover:scale-[1.02] shadow-lg hover:shadow-xl",
            )}
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
        >
            {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/25 px-5 py-1.5 text-sm font-bold gap-1.5 rounded-full">
                        <Star className="h-3.5 w-3.5 fill-white" />
                        Most Popular
                    </Badge>
                </div>
            )}

            {isCurrentPlan && (
                <div className="absolute -top-4 right-6 z-20">
                    <Badge className="bg-emerald-500 text-white border-0 shadow-lg px-4 py-1.5 text-xs font-bold rounded-full">
                        Current Plan
                    </Badge>
                </div>
            )}

            <div className={cn("p-8 pb-6 space-y-5", plan.popular ? "pt-10" : "")}> 
                <div className="flex items-center gap-4">
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110", plan.iconBg)}>
                        <PlanIcon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold tracking-tight text-foreground">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground font-medium">{plan.tagline}</p>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black tracking-tight text-foreground">{formatPrice(price)}</span>
                        <span className="text-muted-foreground font-medium text-sm">/mo</span>
                    </div>
                    {isAnnual ? (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {formatPrice(totalAnnual)}/year
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">Billed monthly</p>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold", plan.bgAccent)}>
                        <GraduationCap className="h-3 w-3" />
                        {plan.students} Students
                    </div>
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold", plan.bgAccent)}>
                        <Users className="h-3 w-3" />
                        {plan.teachers} Teachers
                    </div>
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold", plan.bgAccent)}>
                        <Shield className="h-3 w-3" />
                        {plan.admins} Admins
                    </div>
                </div>

                <Button
                    className={cn(
                        "w-full h-12 rounded-2xl font-bold text-base shadow-lg transition-all duration-300",
                        "hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl",
                        isCurrentPlan
                            ? "bg-muted text-muted-foreground cursor-default hover:scale-100 hover:shadow-lg"
                            : plan.popular
                                ? `bg-gradient-to-r ${plan.gradient} text-white shadow-orange-500/25`
                                : "bg-foreground text-background hover:bg-foreground/90",
                    )}
                    disabled={isCurrentPlan || isUpdating}
                    onClick={() => onChoose(plan.slug)}
                >
                    {isCurrentPlan ? "Your Current Plan" : (<>{plan.cta}<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" /></>)}
                </Button>
            </div>

            <div className="mx-8 h-px bg-border/60" />

            <div className="p-8 pt-6 flex-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">What's included</p>
                <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                        <li key={`${plan.id}_${i}`} className="flex items-start gap-3 text-sm">
                            {feature.included ? (
                                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5", feature.highlight ? `bg-gradient-to-br ${plan.gradient} shadow-sm` : "bg-emerald-500/15")}>
                                    <Check className={cn("h-3 w-3", feature.highlight ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
                                </div>
                            ) : (
                                <div className="h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                                    <X className="h-3 w-3 text-muted-foreground/40" />
                                </div>
                            )}
                            <span className={cn("font-medium leading-snug", feature.included ? "text-foreground" : "text-muted-foreground/60")}>{feature.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default function Pricing() {
    const navigate = useNavigate();
    const [isAnnual, setIsAnnual] = useState(false);
    const [plans] = useState<SubscriptionPlan[]>(SEEDED_PLANS);
    const [loading] = useState(false);
    const [error] = useState<string | null>(null);
    const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<string | undefined>(undefined);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        setCurrentPlan(user?.institute?.subscription_plan);
    }, [user]);

    const uiPlans = useMemo(() => plans.map(mapPlanToUI), [plans]);

    const handlePlanChange = async (slug: string) => {
        if (!user) {
            navigate('/signup');
            return;
        }

        if (!user?.institute?.id || currentPlan === slug) return;

        try {
            setUpdatingSlug(slug);
            await updateInstitute(user.institute.id, { subscription_plan: slug });
            setCurrentPlan(slug);
            toast({ title: "Plan updated", description: `Your institute is now on ${slug}.` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update plan";
            toast({ title: "Plan update failed", description: message, variant: "destructive" });
        } finally {
            setUpdatingSlug(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            {/* Animated background blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/2 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navigation */}
            <nav className="relative z-50 border-b border-border/40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/25">
                                <GraduationCap className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                                EduYantra
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-8">
                            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Home
                            </Link>
                            <Link to="/pricing" className="text-sm font-medium text-foreground">
                                Pricing
                            </Link>
                            {user ? (
                                <Button asChild className="rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                                    <Link to="/dashboard">Dashboard</Link>
                                </Button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" asChild className="rounded-xl font-medium">
                                        <Link to="/login">Sign In</Link>
                                    </Button>
                                    <Button asChild className="rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                                        <Link to="/signup">Get Started</Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 space-y-12 py-16 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="text-center space-y-5 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                        <Sparkles className="h-4 w-4" />
                        Pricing Plans
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
                        Choose the Perfect Plan
                        <br />
                        <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">for Your Institute</span>
                    </h1>
                    <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                        From small coaching centres to large school chains — EduYantra scales with your needs. Start free, upgrade anytime.
                    </p>

                    <div className="inline-flex items-center gap-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl px-6 py-3 border border-border/50 shadow-sm">
                        <span className={cn("text-sm font-bold transition-colors", !isAnnual ? "text-foreground" : "text-muted-foreground")}>Monthly</span>
                        <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-500" />
                        <span className={cn("text-sm font-bold transition-colors", isAnnual ? "text-foreground" : "text-muted-foreground")}>Annual</span>
                    </div>
                </div>

                {loading && (
                    <div className="grid gap-6 lg:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 max-w-[1400px] mx-auto items-start">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="rounded-3xl border bg-card p-6 space-y-4 animate-pulse">
                                <div className="h-8 w-2/3 bg-muted rounded" />
                                <div className="h-6 w-1/2 bg-muted rounded" />
                                <div className="h-10 w-full bg-muted rounded-2xl" />
                                <div className="h-24 w-full bg-muted rounded" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <div className="max-w-xl mx-auto text-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
                        <p className="font-semibold text-destructive">Unable to load plans</p>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                )}

                {!loading && !error && (
                    <div className="grid gap-6 lg:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 max-w-[1400px] mx-auto items-start">
                        {uiPlans.map((plan, index) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                isAnnual={isAnnual}
                                currentPlan={currentPlan}
                                index={index}
                                isUpdating={updatingSlug !== null}
                                onChoose={handlePlanChange}
                            />
                        ))}
                    </div>
                )}

                <div className="max-w-4xl mx-auto">
                    <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-white dark:from-orange-950/30 dark:via-amber-950/20 dark:to-zinc-900/50 p-8 md:p-12">
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground">AI Pro Features</h2>
                                    <p className="text-sm text-muted-foreground font-medium">Powered by machine learning — predict, prevent, personalise</p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    { icon: Target, title: "At-Risk Detection", desc: "Identify struggling students early" },
                                    { icon: TrendingUp, title: "Predictive Analytics", desc: "Forecast exam performance" },
                                    { icon: Flame, title: "Attendance Heatmaps", desc: "Visualise cold-spots by class" },
                                    { icon: Activity, title: "Workload Optimizer", desc: "Balance teacher assignments" },
                                ].map((feat, i) => (
                                    <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-orange-500/10 backdrop-blur-sm">
                                        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                            <feat.icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-foreground">{feat.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <h3 className="text-2xl font-extrabold tracking-tight text-foreground">Need custom enterprise pricing?</h3>
                    <div className="flex items-center justify-center gap-3 pt-2">
                        <Button size="lg" className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold h-12 px-8">
                            Contact Sales
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-border/40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="col-span-2 md:col-span-1">
                            <Link to="/" className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/25">
                                    <GraduationCap className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                                    EduYantra
                                </span>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                                Modern school management for the digital age.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-foreground mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link to="/" className="hover:text-foreground transition-colors">Features</Link></li>
                                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                                <li><Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-foreground mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                                <li><Link to="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                                <li><Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                                <li><Link to="/data-security" className="hover:text-foreground transition-colors">Data Security</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
                        <p>&copy; 2026 EduYantra. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
