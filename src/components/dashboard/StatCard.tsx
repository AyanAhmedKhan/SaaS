import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "accent" | "success" | "warning";
  delay?: number;
}

const variantStyles = {
  default: "bg-card hover:shadow-card-hover",
  primary: "gradient-primary text-primary-foreground hover:shadow-glow-primary",
  accent: "gradient-accent text-accent-foreground hover:shadow-glow-accent",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-foreground/15 text-primary-foreground",
  accent: "bg-accent-foreground/15 text-accent-foreground",
  success: "bg-success-foreground/15 text-success-foreground",
  warning: "bg-warning-foreground/15 text-warning-foreground",
};

function AnimatedNumber({ value }: { value: string | number }) {
  const [display, setDisplay] = useState("0");
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''), 10) : value;
  const prefix = typeof value === 'string' ? value.replace(/[0-9,]/g, '').charAt(0) === value.charAt(0) ? value.charAt(0) : '' : '';
  const suffix = typeof value === 'string' ? value.replace(/[0-9,]/g, '').slice(prefix ? 1 : 0) : '';

  useEffect(() => {
    if (isNaN(numericValue)) {
      setDisplay(String(value));
      return;
    }

    const duration = 600;
    const steps = 20;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = current / steps;
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(numericValue * eased);
      setDisplay(currentVal.toLocaleString());
      if (current >= steps) clearInterval(timer);
    }, stepDuration);

    return () => clearInterval(timer);
  }, [numericValue, value]);

  return <>{prefix}{display}{suffix}</>;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  delay = 0
}: StatCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 animate-slide-in-up border-border/50",
      variantStyles[variant]
    )} style={{ animationDelay: `${delay}ms`, opacity: 0 }}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn(
              "text-sm font-medium",
              variant === "default" ? "text-muted-foreground" : "opacity-80"
            )}>
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold tracking-tight">
                <AnimatedNumber value={value} />
              </h3>
              {trend && (
                <span className={cn(
                  "inline-flex items-center text-sm font-semibold rounded-full px-1.5",
                  trend.isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500"
                )}>
                  {trend.isPositive ? "↑" : "↓"}{Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className={cn(
                "text-sm",
                variant === "default" ? "text-muted-foreground" : "opacity-70"
              )}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-110",
            iconStyles[variant]
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
