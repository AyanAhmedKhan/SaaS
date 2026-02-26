import { useState, useEffect, useCallback } from "react";
import { Plus, Search, DollarSign, AlertCircle, Loader2, CheckCircle2, XCircle, Clock, IndianRupee, Receipt, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFeePayments, getClasses } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { FeePayment, Class as ClassType } from "@/types";

export default function Fees() {
  const { isRole } = useAuth();
  const [fees, setFees] = useState<FeePayment[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFee, setSelectedFee] = useState<FeePayment | null>(null);

  const isStudent = isRole('student');
  const isParent = isRole('parent');
  const canCreate = isRole('super_admin', 'institute_admin');
  const isStudentView = isStudent || isParent;

  // Summary stats
  const totalAmount = fees.reduce((s, f) => s + (f.amount || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.paid_amount ?? 0), 0);
  const paidCount = fees.filter(f => f.status === "paid").length;
  const pendingCount = fees.filter(f => f.status === "pending").length;
  const overdueCount = fees.filter(f => f.status === "overdue").length;
  const paidPercentage = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (classFilter !== "all") params.class_id = classFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const [feeRes, classRes] = await Promise.all([
        getFeePayments(params),
        isStudentView ? Promise.resolve({ success: true, data: { classes: [] } }) : getClasses(),
      ]);

      if (feeRes.success && feeRes.data) {
        setFees((feeRes.data as { payments: FeePayment[] }).payments || []);
      }
      if (classRes.success && classRes.data) {
        setClasses((classRes.data as { classes: ClassType[] }).classes || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load fee records";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [classFilter, statusFilter, searchQuery, isStudentView]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "overdue":
        return <Badge className="bg-red-500/10 text-red-600"><XCircle className="h-3 w-3 mr-1" /> Overdue</Badge>;
      case "partial":
        return <Badge className="bg-blue-500/10 text-blue-600"><IndianRupee className="h-3 w-3 mr-1" /> Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {isStudentView ? "Fee Status" : "Fee Management"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isStudentView
                ? "View your fee status and payment history."
                : "Track fee collection and manage payment records."}
            </p>
          </div>
          {canCreate && (
            <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              Create Fee Entry
            </Button>
          )}
        </div>

        {/* ═══════════ STUDENT / PARENT VIEW ═══════════ */}
        {isStudentView && !loading && !error && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border/40 bg-gradient-to-br from-emerald-500/5 to-emerald-500/0">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Paid</p>
                    <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalPaid)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-gradient-to-br from-amber-500/5 to-amber-500/0">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-black text-amber-600">
                      {formatCurrency(totalAmount - totalPaid)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40 sm:col-span-2 lg:col-span-1">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Payment Progress</p>
                    <span className="text-sm font-bold text-foreground">{paidPercentage}%</span>
                  </div>
                  <Progress
                    value={paidPercentage}
                    className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-emerald-600"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(totalPaid)} of {formatCurrency(totalAmount)} paid
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment History */}
            {fees.length > 0 ? (
              <Card className="border-border/40 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fees.map((fee, idx) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
                      style={{ animationDelay: `${idx * 40}ms` }}
                      onClick={() => setSelectedFee(fee)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${fee.status === 'paid' ? 'bg-emerald-500/10' :
                            fee.status === 'overdue' ? 'bg-red-500/10' : 'bg-amber-500/10'
                          }`}>
                          <IndianRupee className={`h-5 w-5 ${fee.status === 'paid' ? 'text-emerald-600' :
                              fee.status === 'overdue' ? 'text-red-500' : 'text-amber-600'
                            }`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {(fee as any).fee_type ? (fee as any).fee_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Fee Payment'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(fee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-sm">{formatCurrency(fee.amount)}</p>
                          {getStatusBadge(fee.status)}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/40">
                <CardContent className="py-12 text-center space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                    <DollarSign className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">No fee records found.</p>
                  <p className="text-xs text-muted-foreground/60">Fee records will appear here once they are created by your institute.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ═══════════ ADMIN VIEW ═══════════ */}
        {!isStudentView && (
          <>
            {/* Summary Cards */}
            {!loading && !error && fees.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="text-lg font-bold">{paidCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-lg font-bold">{pendingCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Overdue</p>
                      <p className="text-lg font-bold">{overdueCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search fees by student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-border/50"
                />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fee Table */}
            {!loading && !error && fees.length > 0 && (
              <Card className="border-border/40 shadow-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fees.map((fee) => (
                        <TableRow key={fee.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell>
                            <p className="font-medium">{fee.student_name || `Student #${fee.student_id}`}</p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fee.class_name || "—"}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(fee.amount)}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(fee.paid_amount ?? 0)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(fee.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </TableCell>
                          <TableCell>{getStatusBadge(fee.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedFee(fee)}>View</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {!loading && !error && fees.length === 0 && (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">No fee records found.</p>
              </div>
            )}
          </>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading fee records...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </div>
        )}

        {/* Fee Detail Dialog */}
        <Dialog open={!!selectedFee} onOpenChange={(open) => !open && setSelectedFee(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                Payment Details
              </DialogTitle>
            </DialogHeader>
            {selectedFee && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  {selectedFee.student_name && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Student</p>
                      <p className="text-sm font-medium">{selectedFee.student_name}</p>
                    </div>
                  )}
                  {selectedFee.class_name && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Class</p>
                      <p className="text-sm font-medium">{selectedFee.class_name}</p>
                    </div>
                  )}
                  {(selectedFee as any).fee_type && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fee Type</p>
                      <Badge variant="outline" className="capitalize">
                        {(selectedFee as any).fee_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    {getStatusBadge(selectedFee.status)}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedFee.amount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Paid Amount</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(selectedFee.paid_amount ?? 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedFee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {selectedFee.paid_date && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Paid Date</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedFee.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {selectedFee.payment_method && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Payment Method</p>
                      <p className="text-sm font-medium capitalize">{selectedFee.payment_method.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {selectedFee.receipt_number && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Receipt No.</p>
                      <p className="text-sm font-mono font-medium">{selectedFee.receipt_number}</p>
                    </div>
                  )}
                </div>

                {selectedFee.remarks && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Remarks</p>
                      <p className="text-sm text-foreground">{selectedFee.remarks}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
