import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Building2, AlertCircle, Loader2, Users, GraduationCap, Settings } from "lucide-react";
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
import { getInstitutes } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Institute } from "@/types";

export default function Institutes() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "trial":
        return <Badge className="bg-amber-500/10 text-amber-600">Trial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
            <Button
              className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md"
              onClick={() => toast({ title: "Coming Soon", description: "Institute creation will be available in the next release." })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Institute
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search institutes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
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
                className="hover:shadow-card-hover transition-all duration-300 animate-scale-in group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight">{institute.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{institute.code}</p>
                      </div>
                    </div>
                    {getStatusBadge(institute.status)}
                  </div>

                  {institute.address && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{institute.address}</p>
                  )}

                  <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                    {institute.email && (
                      <span className="text-xs text-muted-foreground truncate">{institute.email}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-md bg-muted/50 capitalize">
                      {institute.subscription_plan || "free"} plan
                    </span>
                    {institute.modules_enabled && (
                      <span className="text-xs text-muted-foreground">
                        {institute.modules_enabled.length} modules
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => toast({ title: "Coming Soon", description: "Institute management will be available in the next release." })}
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
    </DashboardLayout>
  );
}
