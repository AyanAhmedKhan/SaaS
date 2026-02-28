import { useState, useEffect, useCallback } from "react";
import { Search, Building2, AlertCircle, Loader2, Users, GraduationCap, Settings, MapPin, Mail, Globe, CreditCard } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getInstitutes } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Institute } from "@/types";
import { AddInstituteDialog } from "@/components/institute/AddInstituteDialog";
import { ManageInstituteDialog } from "@/components/institute/ManageInstituteDialog";

export default function Institutes() {
  const { isRole } = useAuth();
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [manageInstitute, setManageInstitute] = useState<Institute | null>(null);

  const canCreate = isRole('super_admin');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await getInstitutes(params);
      if (res.success && res.data) {
        setInstitutes((res.data as { institutes: Institute[] }).institutes || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load institutes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "suspended": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "archived": return "bg-muted text-muted-foreground border-muted";
      case "trial": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500";
      case "suspended": return "bg-red-500";
      case "archived": return "bg-gray-400";
      case "trial": return "bg-amber-500";
      default: return "bg-gray-400";
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "enterprise": return "bg-violet-500/10 text-violet-600 border-violet-500/20";
      case "premium": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "standard": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-muted/50 text-muted-foreground border-border/50";
    }
  };

  // Summary stats
  const total = institutes.length;
  const active = institutes.filter(i => i.status === "active").length;
  const totalStudentsCap = institutes.reduce((sum, i) => sum + (i.max_students || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Institutes</h1>
            <p className="text-muted-foreground text-sm">Manage registered institutes on the platform.</p>
          </div>
          {canCreate && (
            <AddInstituteDialog onSuccess={fetchData} />
          )}
        </div>

        {/* Summary Cards */}
        {!loading && !error && institutes.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Institutes</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{active}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active</p>
            </div>
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">{totalStudentsCap.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Capacity</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search institutes by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/50 focus-visible:ring-primary/30"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading institutes...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* Institute Cards */}
        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {institutes.map((institute, idx) => (
              <Card
                key={institute.id}
                className="overflow-hidden hover:shadow-card-hover transition-all duration-300 animate-scale-in group cursor-pointer"
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => setManageInstitute(institute)}
              >
                <CardContent className="p-0">
                  {/* Card Top Gradient Bar */}
                  <div className={cn(
                    "h-1.5",
                    institute.status === "active" ? "bg-gradient-to-r from-emerald-500 to-green-500" :
                      institute.status === "suspended" ? "bg-gradient-to-r from-red-500 to-rose-500" :
                        institute.status === "trial" ? "bg-gradient-to-r from-amber-400 to-orange-500" :
                          "bg-gradient-to-r from-gray-300 to-gray-400"
                  )} />

                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <span className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                            getStatusDot(institute.status)
                          )} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold leading-tight truncate">{institute.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{institute.code}</p>
                        </div>
                      </div>
                      <Badge className={cn("capitalize text-[10px] border shrink-0", getStatusColor(institute.status))}>
                        {institute.status}
                      </Badge>
                    </div>

                    {/* Location */}
                    {(institute.address || institute.city) && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">
                          {[institute.address, institute.city, institute.state].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Contact Row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {institute.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          {institute.email}
                        </span>
                      )}
                    </div>

                    {/* Plan & Capacity */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/40">
                      <Badge variant="outline" className={cn("capitalize text-[10px] px-2", getPlanColor(institute.subscription_plan))}>
                        <CreditCard className="h-2.5 w-2.5 mr-1" />
                        {institute.subscription_plan || "basic"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {institute.max_students?.toLocaleString() || "—"} max
                      </span>
                    </div>

                    {/* Manage Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setManageInstitute(institute); }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && institutes.length === 0 && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No institutes found.</p>
          </div>
        )}
      </div>

      {/* Manage Dialog */}
      {manageInstitute && (
        <ManageInstituteDialog
          institute={manageInstitute}
          open={!!manageInstitute}
          onOpenChange={(open) => { if (!open) setManageInstitute(null); }}
          onSuccess={fetchData}
        />
      )}
    </DashboardLayout>
  );
}
