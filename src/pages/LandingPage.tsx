import { Link } from "react-router-dom";
import {
  GraduationCap, Users, BookOpen, Calendar, BarChart3, Bell,
  CheckCircle2, ArrowRight, Star, Shield, Zap, Globe,
  ChevronRight, Play, Award, Clock, TrendingUp, Brain,
  Smartphone, Lock, HeartHandshake, School
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Users,
    title: "Student Management",
    description: "Complete student profiles, enrollment tracking, and academic records in one place.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Calendar,
    title: "Attendance Tracking",
    description: "Digital attendance with real-time notifications to parents and detailed reports.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: BookOpen,
    title: "Syllabus & Assignments",
    description: "Track curriculum progress, assign homework, and manage submissions effortlessly.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: BarChart3,
    title: "Exams & Reports",
    description: "Create exams, record results, and generate comprehensive performance reports.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: Bell,
    title: "Notices & Alerts",
    description: "Instant communication with students, parents, and staff via smart notifications.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Intelligent analytics to identify at-risk students and optimize teaching strategies.",
    gradient: "from-indigo-500 to-blue-500",
  },
];

const stats = [
  { value: "10,000+", label: "Students Managed" },
  { value: "500+", label: "Schools Trust Us" },
  { value: "99.9%", label: "Uptime Guarantee" },
  { value: "4.9/5", label: "User Rating" },
];

const testimonials = [
  {
    name: "Dr. Priya Sharma",
    role: "Principal, Delhi Public School",
    avatar: "PS",
    content: "EduYantra transformed how we manage our school. The parent engagement has improved dramatically, and our administrative work reduced by 60%.",
    rating: 5,
  },
  {
    name: "Rajesh Kumar",
    role: "Parent",
    avatar: "RK",
    content: "I can track my child's attendance, assignments, and results in real-time. The app notifications keep me connected with the school.",
    rating: 5,
  },
  {
    name: "Sunita Verma",
    role: "Class Teacher, Springfield Academy",
    avatar: "SV",
    content: "Taking attendance and managing assignments is so easy now. I save hours every week that I can spend actually teaching.",
    rating: 5,
  },
];

const benefits = [
  { icon: Clock, text: "Save 10+ hours weekly on admin tasks" },
  { icon: TrendingUp, text: "Improve student performance by 25%" },
  { icon: HeartHandshake, text: "Boost parent engagement by 80%" },
  { icon: Lock, text: "Enterprise-grade security & privacy" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-emerald-50/60 dark:from-slate-950 dark:via-blue-950/20 dark:to-emerald-950/20">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-3xl animate-blob-delay" />
        <div className="absolute -bottom-32 right-1/4 w-[350px] h-[350px] bg-violet-400/10 rounded-full blur-3xl animate-blob-delay-2" />
        <div className="absolute top-2/3 left-1/3 w-[300px] h-[300px] bg-orange-400/5 rounded-full blur-3xl animate-blob" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 w-full border-b border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">EduYantra</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 shadow-lg shadow-primary/25">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20 animate-slide-in-up">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Trusted by 500+ Schools Across India
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground animate-slide-in-up" style={{ animationDelay: "100ms" }}>
              The Complete
              <span className="block bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                School Management
              </span>
              Platform
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-in-up" style={{ animationDelay: "200ms" }}>
              Streamline attendance, academics, fees, and parent communication — all in one powerful platform. Built for modern schools.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-up" style={{ animationDelay: "300ms" }}>
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 shadow-xl shadow-primary/30">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base glass border-white/20">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-slide-in-up" style={{ animationDelay: "400ms" }}>
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <benefit.icon className="h-4 w-4 text-emerald-500" />
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <div className="mt-16 md:mt-20 relative animate-slide-in-up" style={{ animationDelay: "500ms" }}>
            <div className="relative mx-auto max-w-5xl">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-500/20 to-emerald-500/20 blur-3xl opacity-50" />
              
              {/* Dashboard mockup */}
              <div className="relative rounded-2xl border border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      eduyantra.app/dashboard
                    </div>
                  </div>
                </div>
                <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-blue-950/30 min-h-[300px] md:min-h-[400px]">
                  {/* Dashboard grid preview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {["Total Students", "Teachers", "Attendance", "Pending Fees"].map((label, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-border/50 shadow-sm">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-2xl md:text-3xl font-bold text-foreground mt-1">
                          {["1,247", "52", "94.5%", "₹2.4L"][i]}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-border/50 shadow-sm h-32 md:h-40">
                      <p className="text-xs text-muted-foreground mb-2">Attendance Trend</p>
                      <div className="flex items-end justify-between h-20 gap-1">
                        {[75, 82, 90, 88, 95, 92, 94].map((h, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-primary to-blue-400 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-border/50 shadow-sm h-32 md:h-40">
                      <p className="text-xs text-muted-foreground mb-2">Recent Notices</p>
                      <div className="space-y-2">
                        {["Parent-Teacher Meeting - March 15", "Holiday: Holi - March 14", "Exam Schedule Released"].map((notice, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-red-500" : i === 1 ? "bg-amber-500" : "bg-blue-500")} />
                            <span className="text-muted-foreground truncate">{notice}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 border-y border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20">
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Everything Your School Needs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A comprehensive suite of tools designed specifically for modern educational institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className={cn(
                  "group relative p-6 md:p-8 rounded-2xl transition-all duration-300",
                  "glass border border-white/20 hover:border-white/40",
                  "hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.02]"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                  `bg-gradient-to-br ${feature.gradient}`
                )}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 md:py-32 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-sm bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Get Started in Minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Simple setup, powerful results. Your school can be up and running today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 opacity-30" />
            
            {[
              { step: "1", title: "Sign Up Your School", description: "Create your institute account in under 2 minutes. No credit card required.", icon: School },
              { step: "2", title: "Add Your Data", description: "Import students, teachers, and classes. We support bulk CSV uploads.", icon: Users },
              { step: "3", title: "Go Live!", description: "Share login credentials and start managing your school digitally.", icon: Zap },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="relative z-10 w-12 h-12 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/30">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-sm bg-violet-500/10 text-violet-600 border-violet-500/20">
              Testimonials
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Loved by Educators
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See what school administrators, teachers, and parents have to say.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl glass border border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-xl"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                
                <p className="text-foreground/90 text-sm leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="relative py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-600 to-emerald-500" />
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="relative z-10 p-8 md:p-16 text-center text-white">
              <Badge className="mb-6 bg-white/20 border-white/30 text-white">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                14-Day Free Trial
              </Badge>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Ready to Transform Your School?
              </h2>
              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Join hundreds of schools already using EduYantra. Start your free trial today — no credit card required.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 bg-white text-primary hover:bg-white/90 shadow-xl">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 bg-transparent border-white/30 text-white hover:bg-white/10">
                    Sign In
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">EduYantra</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Modern school management platform built for Indian schools.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
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

          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 EduYantra. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                SOC 2 Compliant
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Made in India
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
