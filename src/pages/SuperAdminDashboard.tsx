import { useState, useEffect } from "react";
import { Building2, Users, GraduationCap, ShieldCheck, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { api } from "@/lib/api";

interface SuperAdminStats {
    instituteSummary: { status: string; c: string }[];
    userSummary: { role: string; c: string }[];
    totalActiveStudents: number;
}

export default function SuperAdminDashboard() {
    const [data, setData] = useState<SuperAdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get<{ data: SuperAdminStats }>('/dashboard/super-admin');
                if (response.success && response.data) {
                    // The API returns the specific object inside 'data' maybe?
                    // Let's check getSuperAdminDashboard API structure in api.ts
                    // The response structure is ApiResponse<any>
                    // So if we use api.get, response.data holds the actual payload.
                    // In the routes: res.json({ success: true, data: { instituteSummary, userSummary, totalActiveStudents }})
                    setData(response.data as any);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load dashboard';
                console.error('[SuperAdminDashboard] Error:', message);
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <div className="relative">
                        <div className="h-12 w-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium animate-pulse-slow">Loading dashboard...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <div>
                        <p className="text-foreground font-semibold mb-1">Load Error</p>
                        <p className="text-muted-foreground text-sm max-w-md">{error}</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Calculate totals from summaries
    let totalInstitutes = 0;
    let activeInstitutes = 0;
    if (data?.instituteSummary) {
        data.instituteSummary.forEach(inst => {
            const count = parseInt(inst.c);
            totalInstitutes += count;
            if (inst.status === 'active') activeInstitutes += count;
        });
    }

    let totalUsers = 0;
    let totalFaculty = 0;
    if (data?.userSummary) {
        data.userSummary.forEach(u => {
            const count = parseInt(u.c);
            totalUsers += count;
            if (u.role === 'faculty') totalFaculty += count;
        });
    }

    const totalActiveStudents = data?.totalActiveStudents || 0;

    return (
        <DashboardLayout>
            <div className="space-y-6 page-enter">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Super Admin Dashboard</h1>
                    <p className="text-muted-foreground text-sm">
                        Overview of the EduYantra platform across all institutes.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <StatCard
                        title="Total Institutes"
                        value={totalInstitutes.toLocaleString()}
                        subtitle={`${activeInstitutes} Active`}
                        icon={Building2}
                        variant="primary"
                        delay={0}
                    />
                    <StatCard
                        title="Total Users"
                        value={totalUsers.toLocaleString()}
                        subtitle="Registered accounts"
                        icon={Users}
                        variant="accent"
                        delay={50}
                    />
                    <StatCard
                        title="Active Students"
                        value={totalActiveStudents.toLocaleString()}
                        subtitle="Platform wide"
                        icon={GraduationCap}
                        delay={100}
                    />
                    <StatCard
                        title="Total Faculty"
                        value={totalFaculty.toLocaleString()}
                        subtitle="Platform wide"
                        icon={ShieldCheck}
                        delay={150}
                    />
                </div>

                {/* Further super admin specific components could be added here later */}
            </div>
        </DashboardLayout>
    );
}
