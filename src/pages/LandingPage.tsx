import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, BookOpen, BarChart3, Bell,
  CheckCircle2, ArrowRight, Star, Shield, Zap, Globe,
  ChevronRight, Menu, X, Award, Clock, TrendingUp, Brain,
  Lock, HeartHandshake, School, GraduationCap,
  BarChart2, CreditCard, Layers, IndianRupee, CalendarDays,
  Home, GraduationCap as GradCap, Wallet, Settings, Search,
  TrendingDown, Minus, Activity, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { cn } from "@/lib/utils";

// ─── Animation Variants ──────────────────────────────────────────────────────

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: "blur(12px)", y: 16 },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { type: "spring", bounce: 0.3, duration: 1.5 } as const,
    },
  },
};

const heroContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "Pricing", href: "/pricing" },
];

const stats = [
  { value: "10,000+", label: "Students Managed" },
  { value: "500+", label: "Schools Trust Us" },
  { value: "99.9%", label: "Uptime Guarantee" },
  { value: "4.9/5", label: "User Rating" },
];

const features = [
  {
    icon: Users,
    title: "Student Management",
    description:
      "Complete student profiles, enrollment tracking, and academic records in one unified place.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: BarChart3,
    title: "Attendance Tracking",
    description:
      "Digital attendance with real-time parent notifications, reports, and trend analysis.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: BookOpen,
    title: "Syllabus & Assignments",
    description:
      "Plan curriculum, assign homework, track submissions, and monitor completion rates.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: BarChart2,
    title: "Exams & Results",
    description:
      "Create exam schedules, record results, and generate insightful performance reports.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: CreditCard,
    title: "Fee Management",
    description:
      "Automate fee collection, track due payments, and send automated reminders to parents.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Intelligent analytics to surface at-risk students and optimize teaching strategies.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
];

const steps = [
  {
    step: 1,
    title: "Create Your Institute",
    description:
      "Register your school in under 2 minutes. No technical knowledge required.",
    icon: School,
    color: "from-emerald-500 to-teal-500",
  },
  {
    step: 2,
    title: "Add Students & Staff",
    description:
      "Import existing data via CSV or add students, teachers, and classes manually.",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: 3,
    title: "Go Live Today",
    description:
      "Share login credentials with staff and parents. Start managing digitally from day one.",
    icon: Zap,
    color: "from-violet-500 to-purple-500",
  },
];

const testimonials = [
  {
    name: "Dr. Priya Sharma",
    role: "Principal, Delhi Public School",
    initials: "PS",
    content:
      "EduYantra transformed how we manage our school. Parent engagement improved dramatically, and administrative work reduced by 60%.",
    rating: 5,
    color: "from-blue-500 to-indigo-500",
  },
  {
    name: "Rajesh Kumar",
    role: "Parent",
    initials: "RK",
    content:
      "I can track my child's attendance, assignments, and results in real-time. The notifications keep me perfectly connected with the school.",
    rating: 5,
    color: "from-emerald-500 to-teal-500",
  },
  {
    name: "Sunita Verma",
    role: "Class Teacher, Springfield Academy",
    initials: "SV",
    content:
      "Taking attendance and managing assignments is so easy now. I save hours every week that I can spend actually teaching my students.",
    rating: 5,
    color: "from-violet-500 to-purple-500",
  },
];

const trustedSchools = [
  "Vidya Niketan",
  "Sunrise Academy",
  "Green Valley School",
  "National Public School",
  "St. Mary's Convent",
  "Modern High School",
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-primary/10 text-primary border-primary/20",
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Scroll-aware navigation ─────────────────────────────────────────────────

function ScrollAwareNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        className={cn(
          "w-full border-b transition-all duration-300",
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-border/50 shadow-sm"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group flex-shrink-0"
            >
              <img
                src="/logo.jpeg"
                alt="EduYantra"
                className="h-9 w-9 rounded-xl object-cover shadow-md shadow-primary/20 transition-transform group-hover:scale-105"
              />
              <span className="text-lg font-bold text-foreground">
                EduYantra
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((item) =>
                item.href.startsWith("#") ? (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                )
              )}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="shadow-sm">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              className="lg:hidden relative z-20 p-2 -mr-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.span
                    key="x"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-background/95 backdrop-blur-xl border-b border-border shadow-xl"
          >
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
              {navLinks.map((item) =>
                item.href.startsWith("#") ? (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block text-base font-medium text-muted-foreground hover:text-foreground py-1 transition-colors"
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block text-base font-medium text-muted-foreground hover:text-foreground py-1 transition-colors"
                  >
                    {item.name}
                  </Link>
                )
              )}
              <div className="pt-4 flex flex-col gap-3 border-t border-border/50">
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full">Get Started Free</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <ScrollAwareNav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--primary)/0.15), transparent 70%)",
          }}
        />
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="max-w-6xl mx-auto px-6">
          {/* Animated text block */}
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedGroup
              variants={{
                container: heroContainerVariants,
                ...transitionVariants,
              }}
            >
              {/* Badge */}
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                  <Zap className="h-3.5 w-3.5" />
                  Trusted by 500+ Schools Across India
                </span>
              </div>

              {/* Headline */}
              <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
                The Complete{" "}
                <span className="bg-gradient-to-r from-primary via-amber-500 to-orange-500 bg-clip-text text-transparent">
                  School Management
                </span>{" "}
                Platform
              </h1>

              {/* Sub-headline */}
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Streamline attendance, academics, fees, and parent
                communication&nbsp;— all in one platform built for modern
                Indian schools.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="bg-foreground/10 rounded-[14px] border p-0.5">
                  <Link to="/signup">
                    <Button size="lg" className="rounded-xl px-6 text-base h-11">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <Link to="/pricing">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="rounded-xl px-6 text-base h-11"
                  >
                    View Pricing
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Trust pills */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                {[
                  { icon: Shield, text: "No credit card required" },
                  { icon: CheckCircle2, text: "14-day free trial" },
                  { icon: Lock, text: "Enterprise-grade security" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <item.icon className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </AnimatedGroup>
          </div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-16 md:mt-20 relative"
          >
            {/* Fade-to-bg overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 z-10"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 0%, hsl(var(--background)) 100%)",
              }}
            />

            {/* ── Premium Dashboard Mockup ── */}
            <div className="relative mx-auto max-w-5xl">
              {/* Glow behind the window */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-violet-500/10 to-cyan-500/10 blur-2xl opacity-60 pointer-events-none" />

              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-black/20 bg-background">
                {/* ── Browser chrome ── */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/60 border-b border-border/50 backdrop-blur-sm">
                  <div className="flex gap-1.5 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  {/* Nav arrows */}
                  <div className="hidden sm:flex gap-1">
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-border/60">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M5 1L2 4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"/></svg>
                    </div>
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-border/60">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M3 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"/></svg>
                    </div>
                  </div>
                  <div className="flex-1 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background border border-border/60 text-[11px] text-muted-foreground shadow-sm w-full max-w-xs justify-center">
                      <Lock className="h-2.5 w-2.5 text-emerald-500" />
                      app.eduyantra.in/dashboard
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">A</span>
                    </div>
                  </div>
                </div>

                {/* ── App shell ── */}
                <div className="flex h-[340px] md:h-[400px]">

                  {/* Mini sidebar */}
                  <div className="hidden sm:flex flex-col items-center gap-1 w-12 bg-muted/30 border-r border-border/40 py-3 shrink-0">
                    {[
                      { icon: <Home className="w-4 h-4" />, active: true },
                      { icon: <Users className="w-4 h-4" />, active: false },
                      { icon: <GraduationCap className="w-4 h-4" />, active: false },
                      { icon: <BarChart3 className="w-4 h-4" />, active: false },
                      { icon: <Bell className="w-4 h-4" />, active: false },
                      { icon: <Wallet className="w-4 h-4" />, active: false },
                    ].map((item, i) => (
                      <div key={i} className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        item.active
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                          : "text-muted-foreground hover:bg-muted"
                      )}>
                        {item.icon}
                      </div>
                    ))}
                    <div className="mt-auto">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground">
                        <Settings className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 overflow-hidden bg-muted/20 p-3 md:p-4 space-y-3">

                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">Good morning, Admin 👋</p>
                        <p className="text-[9px] text-muted-foreground">Sunday, March 8, 2026</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/50 text-[10px] text-muted-foreground">
                          <Search className="w-2.5 h-2.5" /> Search...
                        </div>
                        <div className="relative">
                          <div className="w-6 h-6 rounded-lg bg-background border border-border/50 flex items-center justify-center">
                            <Bell className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-background" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-violet-600" />
                      </div>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: "Students", value: "1,247", trend: "+12%", up: true, icon: <Users className="w-3 h-3" />, from: "from-blue-500/10", iconColor: "text-blue-500", trendColor: "text-emerald-500" },
                        { label: "Teachers", value: "52", trend: "+3%", up: true, icon: <GraduationCap className="w-3 h-3" />, from: "from-violet-500/10", iconColor: "text-violet-500", trendColor: "text-emerald-500" },
                        { label: "Attendance", value: "94.5%", trend: "+2.1%", up: true, icon: <Activity className="w-3 h-3" />, from: "from-emerald-500/10", iconColor: "text-emerald-500", trendColor: "text-emerald-500" },
                        { label: "Fee Collected", value: "₹4.2L", trend: "+8%", up: true, icon: <IndianRupee className="w-3 h-3" />, from: "from-amber-500/10", iconColor: "text-amber-500", trendColor: "text-emerald-500" },
                      ].map((card, i) => (
                        <div key={i} className="rounded-xl bg-background border border-border/40 p-2.5 shadow-sm relative overflow-hidden">
                          <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-60", card.from)} />
                          <div className="relative">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{card.label}</p>
                              <div className={cn("w-5 h-5 rounded-md flex items-center justify-center bg-background/80", card.iconColor)}>{card.icon}</div>
                            </div>
                            <p className="text-base md:text-lg font-bold text-foreground leading-none">{card.value}</p>
                            <div className="flex items-center gap-0.5 mt-1">
                              <TrendingUp className={cn("w-2.5 h-2.5", card.trendColor)} />
                              <span className={cn("text-[9px] font-semibold", card.trendColor)}>{card.trend}</span>
                            </div>
                            {/* Mini sparkline */}
                            <div className="flex items-end gap-0.5 mt-1.5 h-4">
                              {[40,60,45,75,55,80,70].map((h,j) => (
                                <div key={j} className={cn("flex-1 rounded-sm opacity-60", card.iconColor.replace("text-","bg-"))} style={{height: `${h}%`}} />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Charts row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">

                      {/* SVG Area Chart */}
                      <div className="md:col-span-2 rounded-xl bg-background border border-border/40 p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[10px] font-semibold text-foreground">Performance Trend</p>
                            <p className="text-[9px] text-muted-foreground">Avg. score across exams</p>
                          </div>
                          <div className="flex gap-1">
                            {["1W","1M","3M"].map((t,i) => (
                              <span key={i} className={cn("text-[8px] px-1.5 py-0.5 rounded font-medium cursor-default",
                                i===1 ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-muted/60"
                              )}>{t}</span>
                            ))}
                          </div>
                        </div>
                        <div className="relative h-[90px] md:h-[110px]">
                          {/* Grid lines */}
                          {[0,1,2,3].map(i => (
                            <div key={i} className="absolute w-full border-t border-border/30" style={{bottom: `${i*33}%`}} />
                          ))}
                          {/* Y labels */}
                          <div className="absolute left-0 top-0 h-full flex flex-col justify-between">
                            {["100","75","50",""].map((l,i) => (
                              <span key={i} className="text-[7px] text-muted-foreground/60 -translate-y-2">{l}</span>
                            ))}
                          </div>
                          {/* SVG chart */}
                          <svg className="absolute inset-0 w-full h-full pl-5" viewBox="0 0 260 80" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(243,75%,59%)" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="hsl(243,75%,59%)" stopOpacity="0" />
                              </linearGradient>
                              <linearGradient id="line2Grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(262,83%,68%)" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="hsl(262,83%,68%)" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {/* Area fill - primary */}
                            <path d="M0,55 C20,50 40,42 60,38 C80,34 100,45 120,32 C140,20 160,28 180,18 C200,10 220,15 240,12 L260,10 L260,80 L0,80 Z"
                              fill="url(#areaGrad)" />
                            {/* Line - primary */}
                            <path d="M0,55 C20,50 40,42 60,38 C80,34 100,45 120,32 C140,20 160,28 180,18 C200,10 220,15 240,12 L260,10"
                              fill="none" stroke="hsl(243,75%,59%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            {/* Area fill - secondary */}
                            <path d="M0,65 C20,60 40,58 60,52 C80,46 100,55 120,48 C140,40 160,44 180,36 C200,28 220,32 240,26 L260,22 L260,80 L0,80 Z"
                              fill="url(#line2Grad)" />
                            {/* Line - secondary */}
                            <path d="M0,65 C20,60 40,58 60,52 C80,46 100,55 120,48 C140,40 160,44 180,36 C200,28 220,32 240,26 L260,22"
                              fill="none" stroke="hsl(262,83%,68%)" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" />
                            {/* Dots on primary line at key points */}
                            {[[60,38],[120,32],[180,18],[260,10]].map(([x,y],i) => (
                              <circle key={i} cx={x} cy={y} r="2.5" fill="hsl(243,75%,59%)" stroke="white" strokeWidth="1" />
                            ))}
                          </svg>
                          {/* X labels */}
                          <div className="absolute bottom-0 left-5 right-0 flex justify-between">
                            {["Jan","Feb","Mar","Apr","May","Jun"].map(m => (
                              <span key={m} className="text-[7px] text-muted-foreground/60">{m}</span>
                            ))}
                          </div>
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-1 rounded-full bg-primary" />
                            <span className="text-[8px] text-muted-foreground">Maths</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-px rounded-full bg-violet-500" style={{borderTop:'1px dashed'}} />
                            <span className="text-[8px] text-muted-foreground">Science</span>
                          </div>
                          <div className="ml-auto text-[8px] font-semibold text-emerald-500 flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5" /> avg 87.4%
                          </div>
                        </div>
                      </div>

                      {/* Right panel – donut + notices */}
                      <div className="flex flex-col gap-2">
                        {/* Donut */}
                        <div className="rounded-xl bg-background border border-border/40 p-3 shadow-sm">
                          <p className="text-[10px] font-semibold text-foreground mb-2">Attendance</p>
                          <div className="flex items-center gap-2.5">
                            <div className="relative w-12 h-12 shrink-0">
                              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(220,14%,92%)" strokeWidth="5" />
                                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(243,75%,59%)" strokeWidth="5"
                                  strokeDasharray="83 17" strokeLinecap="round" />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">94%</span>
                            </div>
                            <div className="space-y-1.5 flex-1">
                              {[
                                { label: "Present", pct: 94, color: "bg-primary" },
                                { label: "Absent", pct: 4, color: "bg-rose-500" },
                                { label: "Late", pct: 2, color: "bg-amber-400" },
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                                  <span className="text-[9px] text-muted-foreground flex-1">{item.label}</span>
                                  <span className="text-[9px] font-semibold text-foreground">{item.pct}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Notices */}
                        <div className="rounded-xl bg-background border border-border/40 p-3 shadow-sm flex-1">
                          <p className="text-[10px] font-semibold text-foreground mb-2">Notices</p>
                          <div className="space-y-2">
                            {[
                              { text: "PTM — March 15", dot: "bg-red-500", tag: "Urgent" },
                              { text: "Holi Holiday", dot: "bg-amber-500", tag: "Event" },
                              { text: "Exam Schedule", dot: "bg-primary", tag: "Exam" },
                              { text: "Annual Day", dot: "bg-emerald-500", tag: "Event" },
                            ].map((n, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", n.dot)} />
                                <span className="text-[9px] text-foreground truncate flex-1">{n.text}</span>
                                <span className={cn("text-[7px] px-1 py-0.5 rounded font-medium shrink-0",
                                  n.dot === "bg-red-500" ? "bg-red-500/10 text-red-600" :
                                  n.dot === "bg-amber-500" ? "bg-amber-500/10 text-amber-600" :
                                  n.dot === "bg-primary" ? "bg-primary/10 text-primary" :
                                  "bg-emerald-500/10 text-emerald-600"
                                )}>{n.tag}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom status bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-t border-border/40 text-[9px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    All systems operational
                  </div>
                  <div className="flex items-center gap-3">
                    <span>v2.4.1</span>
                    <span>EduYantra Dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Trusted By ────────────────────────────────────────────────────── */}
      <section className="py-14 border-y border-border/40 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-8">
            Trusted by leading schools across India
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {trustedSchools.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity"
              >
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
          >
            {stats.map((stat, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center">
                <p className="text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-br from-primary to-amber-500 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-32 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <SectionLabel>
              <Layers className="h-3 w-3" />
              Features
            </SectionLabel>
            <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              Everything Your School Needs
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              A comprehensive suite of tools designed specifically for modern
              educational institutions.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={cn(
                  "group relative p-6 rounded-2xl border border-border/50",
                  "bg-background hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                  "transition-all duration-300 cursor-default"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
                    feature.bg
                  )}
                >
                  <feature.icon className={cn("h-5 w-5", feature.color)} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  Learn more <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <SectionLabel className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              How It Works
            </SectionLabel>
            <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              Get Started in Minutes
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Simple setup, powerful results. Your school can go fully digital
              today.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          >
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[22%] right-[22%] h-px bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 opacity-25" />

            {steps.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="relative text-center group"
              >
                <div
                  className={cn(
                    "relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                    "bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110",
                    s.color
                  )}
                >
                  <s.icon className="h-6 w-6 text-white" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background border border-border text-[10px] font-bold text-muted-foreground flex items-center justify-center">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 md:py-32 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <SectionLabel className="bg-violet-500/10 text-violet-600 border-violet-500/20">
              <Star className="h-3 w-3 fill-current" />
              Testimonials
            </SectionLabel>
            <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              Loved by Educators
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              What school administrators, teachers, and parents say about
              EduYantra.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group relative p-6 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed mb-6">
                  &ldquo;{t.content}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 bg-gradient-to-br",
                      t.color
                    )}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* BG */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-amber-600 to-orange-500" />
            {/* Dot grid */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            {/* Glow orbs */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10 text-center text-white py-16 px-8 md:py-20 md:px-16">
              <Badge className="mb-6 bg-white/20 border-white/30 text-white text-sm">
                <Award className="h-3.5 w-3.5 mr-1.5" />
                14-Day Free Trial — No Credit Card Required
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                Ready to Transform Your School?
              </h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto mb-10">
                Join hundreds of schools already running on EduYantra. Set up
                in minutes, see results from day one.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base bg-white text-primary hover:bg-white/90 shadow-2xl shadow-black/20"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-8 text-base bg-transparent border-white/40 text-white hover:bg-white/15 hover:border-white/60"
                  >
                    View Pricing Plans
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <img
                  src="/logo.jpeg"
                  alt="EduYantra"
                  className="h-9 w-9 rounded-xl object-cover shadow-md shadow-primary/20"
                />
                <span className="text-lg font-bold text-foreground">
                  EduYantra
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Modern school management platform built for Indian schools.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Product
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="#features"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Company
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/about"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/careers"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Legal
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/privacy-policy"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms-of-service"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/data-security"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Data Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 EduYantra. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" /> SOC 2 Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" /> Made in India
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
