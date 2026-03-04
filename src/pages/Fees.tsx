import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, DollarSign, AlertCircle, Loader2,
  CheckCircle2, XCircle, Clock, IndianRupee, Receipt,
  ArrowRight, Wallet, TrendingUp, CreditCard, Calendar,
  FileText, ShieldCheck, Edit3, Trash2
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import {
  getFeePayments, getClasses, getStudents, getFeeStructures,
  recordFeePayment, updateFeePayment, deleteFeePayment,
  createFeeStructure, updateFeeStructure, deleteFeeStructure
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { FeePayment, Class as ClassType, Student, FeeStructure } from "@/types";
import { cn } from "@/lib/utils";

export default function Fees() {
  const { isRole } = useAuth();
  const [activeTab, setActiveTab] = useState("payments");

  // Ledger States
  const [fees, setFees] = useState<FeePayment[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFee, setSelectedFee] = useState<FeePayment | null>(null);

  // Fee Structures States
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [structuresLoading, setStructuresLoading] = useState(true);
  const [structuresError, setStructuresError] = useState<string | null>(null);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [structFormData, setStructFormData] = useState({
    name: "",
    fee_type: "tuition",
    class_id: "",
    amount: "",
    due_date: new Date().toISOString().split('T')[0],
    installments_allowed: false,
    description: ""
  });

  // Form States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [editingFeePayment, setEditingFeePayment] = useState<FeePayment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formStudents, setFormStudents] = useState<Student[]>([]);
  const [formStructures, setFormStructures] = useState<FeeStructure[]>([]);
  const [formData, setFormData] = useState({
    class_id: "",
    student_id: "",
    fee_structure_id: "",
    paid_amount: "",
    payment_method: "cash",
    receipt_number: "",
    remarks: "",
    due_date: new Date().toISOString().split('T')[0],
    status: "paid"
  });

  const isStudent = isRole('student');
  const isParent = isRole('parent');
  const canCreate = isRole('super_admin', 'institute_admin');
  const isStudentView = isStudent || isParent;

  // Summary stats calculations
  const totalAmount = fees.reduce((s, f) => s + (f.amount || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.paid_amount ?? 0), 0);
  const totalPending = totalAmount - totalPaid;
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

  const fetchStructures = useCallback(async () => {
    try {
      setStructuresLoading(true);
      setStructuresError(null);
      const res = await getFeeStructures();
      if (res.success && res.data) {
        setStructures((res.data as any).structures || []);
      } else {
        setStructuresError(res.error?.message || "Failed to load fee structures");
      }
    } catch (err: any) {
      setStructuresError(err.message || "Failed to load fee structures");
    } finally {
      setStructuresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "payments") {
      const debounce = setTimeout(fetchData, 300);
      return () => clearTimeout(debounce);
    } else if (activeTab === "structures") {
      fetchStructures();
    }
  }, [fetchData, fetchStructures, activeTab]);

  const loadFormDependencies = async (classId: string) => {
    try {
      const [stuRes, structRes] = await Promise.all([
        getStudents({ class_id: classId, status: 'active', limit: '1000' }),
        getFeeStructures({ class_id: classId })
      ]);
      if (stuRes.success && stuRes.data) setFormStudents((stuRes.data as any).students || []);
      if (structRes.success && structRes.data) setFormStructures((structRes.data as any).structures || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClassChange = (val: string) => {
    setFormData(prev => ({ ...prev, class_id: val, student_id: "", fee_structure_id: "" }));
    loadFormDependencies(val);
  };

  const handleStructureChange = (val: string) => {
    const st = formStructures.find(s => s.id === val);
    setFormData(prev => ({
      ...prev,
      fee_structure_id: val,
      paid_amount: st ? st.amount.toString() : "",
      due_date: st?.due_date ? new Date(st.due_date).toISOString().split('T')[0] : prev.due_date
    }));
  };

  const openCreateModal = () => {
    setFormData({
      class_id: "", student_id: "", fee_structure_id: "",
      paid_amount: "", payment_method: "cash", receipt_number: "",
      remarks: "", due_date: new Date().toISOString().split('T')[0], status: "paid"
    });
    setFormStudents([]);
    setFormStructures([]);
    setEditingFeePayment(null);
    setFormError("");
    setIsSubmitModalOpen(true);
  };

  const openEditModal = async (fee: FeePayment) => {
    setEditingFeePayment(fee);
    setFormError("");

    // We need to fetch the class's students and structures first
    // For fee payment, we might not have class_id directly on the object if it's just from the join, wait, we do.
    const cid = (fee as any).class_id || classes.find(c => c.name === (fee as any).class_name)?.id || "";

    setFormData({
      class_id: cid,
      student_id: fee.student_id,
      fee_structure_id: fee.fee_structure_id,
      paid_amount: fee.paid_amount?.toString() || "",
      payment_method: fee.payment_method || "cash",
      receipt_number: fee.receipt_number || "",
      remarks: fee.remarks || "",
      due_date: new Date(fee.due_date).toISOString().split('T')[0],
      status: fee.status || "paid"
    });

    if (cid) await loadFormDependencies(cid);
    setIsSubmitModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await deleteFeePayment(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const handleSaveFee = async () => {
    try {
      setFormError("");
      if (!formData.student_id || !formData.fee_structure_id || !formData.paid_amount) {
        setFormError("Please fill all required fields");
        return;
      }
      setIsSaving(true);

      const payload: any = {
        student_id: formData.student_id,
        fee_structure_id: formData.fee_structure_id,
        paid_amount: Number(formData.paid_amount),
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number,
        remarks: formData.remarks,
        due_date: formData.due_date,
        status: formData.status
      };

      if (editingFeePayment) {
        await updateFeePayment(editingFeePayment.id, payload);
      } else {
        await recordFeePayment(payload);
      }

      setIsSubmitModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save fee entry");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors shadow-sm"><CheckCircle2 className="h-3 w-3 mr-1.5" /> Paid</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors shadow-sm"><Clock className="h-3 w-3 mr-1.5" /> Pending</Badge>;
      case "overdue":
        return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-colors shadow-sm animate-pulse"><XCircle className="h-3 w-3 mr-1.5" /> Overdue</Badge>;
      case "partial":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition-colors shadow-sm"><TrendingUp className="h-3 w-3 mr-1.5" /> Partial</Badge>;
      default:
        return <Badge variant="outline" className="shadow-sm">{status}</Badge>;
    }
  };

  const getStatusIconColor = (status: string) => {
    switch (status) {
      case "paid": return "text-emerald-500 bg-emerald-500/10";
      case "overdue": return "text-red-500 bg-red-500/10";
      case "pending": return "text-amber-500 bg-amber-500/10";
      case "partial": return "text-blue-500 bg-blue-500/10";
      default: return "text-gray-500 bg-gray-500/10";
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  return (
    <DashboardLayout>
      <div className="space-y-8 page-enter pb-10">

        {/* PREMIUM HEADER */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-2 border border-primary/20 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wide uppercase">Secure Portal</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {isStudentView ? "Fee Status" : "Fee Management"}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base font-medium max-w-xl">
              {isStudentView
                ? "Manage your payments, view invoices, and track your upcoming academic dues in one place."
                : "Monitor institute collections, track overdue accounts, and manage your financial records seamlessly."}
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreateModal} className="shrink-0 h-12 px-6 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-lg shadow-primary/30 transition-transform active:scale-95 group">
              <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-bold tracking-wide">Create Entry</span>
            </Button>
          )}
        </div>

        {/* ═══════════ STUDENT / PARENT VIEW ═══════════ */}
        {isStudentView && !loading && !error && (
          <div className="space-y-8">
            {/* Elegant Financial Summary */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-3xl transition-transform hover:-translate-y-1 hover:shadow-2xl">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                  <CheckCircle2 className="w-32 h-32" />
                </div>
                <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                  <p className="text-emerald-100 font-semibold tracking-wider text-sm uppercase">Total Paid</p>
                  <p className="text-4xl lg:text-5xl font-black mt-2 drop-shadow-sm">{formatCurrency(totalPaid)}</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl transition-transform hover:-translate-y-1 hover:shadow-2xl">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                  <Clock className="w-32 h-32" />
                </div>
                <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                  <p className="text-amber-100 font-semibold tracking-wider text-sm uppercase">Pending Dues</p>
                  <p className="text-4xl lg:text-5xl font-black mt-2 drop-shadow-sm">
                    {formatCurrency(totalPending)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/50 shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl sm:col-span-2 lg:col-span-1 transition-transform hover:-translate-y-1">
                <CardContent className="p-8 flex flex-col justify-center h-full space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Overall Progress</p>
                    <Badge variant="secondary" className="font-black text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">
                      {paidPercentage}%
                    </Badge>
                  </div>
                  <Progress
                    value={paidPercentage}
                    className="h-4 rounded-full overflow-hidden bg-muted/50"
                  >
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 w-full transition-all duration-1000 ease-out" style={{ transform: `translateX(-${100 - (paidPercentage || 0)}%)` }} />
                  </Progress>
                  <p className="text-sm font-medium text-muted-foreground">
                    <span className="text-foreground font-bold">{formatCurrency(totalPaid)}</span> cleared out of <span className="text-foreground font-bold">{formatCurrency(totalAmount)}</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Digital Invoices List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 px-1">
                <Receipt className="h-6 w-6 text-primary" />
                Your Invoices
              </h2>

              {fees.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {fees.map((fee, idx) => {
                    const isPaid = fee.status === 'paid';
                    const isOverdue = fee.status === 'overdue';
                    return (
                      <Card
                        key={fee.id}
                        onClick={() => setSelectedFee(fee)}
                        className={cn(
                          "relative overflow-hidden border cursor-pointer group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl",
                          isPaid ? "border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20" :
                            isOverdue ? "border-red-500/30 bg-red-50/50 dark:bg-red-950/20" :
                              "border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20"
                        )}
                        style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                      >
                        {/* Side Accent Line */}
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1",
                          isPaid ? "bg-emerald-500" : isOverdue ? "bg-red-500" : "bg-amber-500"
                        )} />

                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", getStatusIconColor(fee.status))}>
                                {isPaid ? <CheckCircle2 className="h-6 w-6" /> : isOverdue ? <AlertCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                              </div>
                              <div>
                                <p className="font-bold text-foreground capitalize tracking-tight">
                                  {(fee as FeePayment & { fee_type?: string }).fee_type?.replace(/_/g, ' ') || 'Fee Payment'}
                                </p>
                                <p className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {new Date(fee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-end justify-between mt-auto">
                            <div className="space-y-1.5">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount</p>
                              <p className="text-2xl font-black tracking-tight">{formatCurrency(fee.amount)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(fee.status)}
                              <div className="flex items-center text-xs font-bold text-primary group-hover:underline mt-1">
                                View Details <ArrowRight className="h-3 w-3 ml-1 transform group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card className="border border-border/40 border-dashed bg-muted/10 rounded-3xl">
                  <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center shadow-inner">
                      <Receipt className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-foreground">All Caught Up!</p>
                      <p className="text-sm text-muted-foreground max-w-sm">No pending invoices or past payments found on your account.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ ADMIN VIEW ═══════════ */}
        {!isStudentView && (
          <div className="space-y-8">
            {/* Dashboard Summary Metrics */}
            {!loading && !error && fees.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-lg bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 flex items-center gap-4 relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
                      <Wallet className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Receivables</p>
                      <p className="text-2xl font-black">{formatCurrency(totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 flex items-center gap-4 relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/20">
                      <TrendingUp className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Collected</p>
                      <p className="text-2xl font-black">{formatCurrency(totalPaid)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 flex items-center gap-4 relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0 shadow-sm border border-amber-500/20">
                      <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Pending Fees</p>
                      <p className="text-2xl font-black">{formatCurrency(totalPending)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 flex items-center gap-4 relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0 shadow-sm border border-red-500/20">
                      <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Overdue Accounts</p>
                      <p className="text-2xl font-black">{overdueCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Premium Table Controls */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white/40 dark:bg-zinc-900/40 p-2 rounded-2xl shadow-sm border border-border/50 backdrop-blur-md">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  placeholder="Search by student name or roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 rounded-xl border-none bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 text-base"
                />
              </div>
              <div className="hidden md:block w-px h-8 bg-border/60 mx-2" />
              <div className="flex items-center gap-2 px-2 pb-2 md:pb-0">
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-[180px] h-10 rounded-lg bg-background border-border/60 font-medium">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50">
                    <SelectItem value="all" className="font-medium">All Classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] h-10 rounded-lg bg-background border-border/60 font-medium">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50">
                    <SelectItem value="all" className="font-medium">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Premium Data Table */}
            {!loading && !error && fees.length > 0 && (
              <Card className="border-0 shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-3xl overflow-hidden ring-1 ring-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30 border-b border-border/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14 px-6 rounded-tl-3xl">Student Info</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Class</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Type</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Total Amount</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Timeline</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Status</TableHead>
                        <TableHead className="text-right font-bold text-muted-foreground uppercase tracking-widest text-xs h-14 px-6 rounded-tr-3xl">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fees.map((fee, idx) => (
                        <TableRow
                          key={fee.id}
                          className="hover:bg-background/80 transition-colors border-b border-border/40 group relative"
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                <span className="font-bold tracking-tight text-primary">
                                  {fee.student_name ? fee.student_name.charAt(0).toUpperCase() : '#'}
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{fee.student_name || `Student #${fee.student_id}`}</p>
                                <p className="text-xs text-muted-foreground/80 font-mono tracking-tight mt-0.5">ID: {fee.student_id.substring(0, 8)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="bg-muted/50 hover:bg-muted font-bold px-2.5 py-1">
                              {fee.class_name || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="font-medium text-sm capitalize">
                              {(fee as FeePayment & { fee_type?: string }).fee_type?.replace(/_/g, ' ') || 'Fee Entry'}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 space-y-1">
                            <p className="font-black text-foreground tracking-tight">{formatCurrency(fee.amount)}</p>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {fee.paid_amount > 0 ? `${formatCurrency(fee.paid_amount)} paid` : ''}
                            </p>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 text-xs font-medium text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(fee.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            {getStatusBadge(fee.status)}
                          </TableCell>
                          <TableCell className="text-right px-6 py-4">
                            <div className="flex items-center justify-end gap-2 relative z-10">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedFee(fee)}
                                className="rounded-xl border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all shadow-sm font-semibold"
                              >
                                Details
                              </Button>
                              {canCreate && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); openEditModal(fee); }}
                                    className="h-8 w-8 rounded-lg hover:bg-blue-100 hover:text-blue-700 text-muted-foreground transition-colors"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(fee.id); }}
                                    className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700 text-muted-foreground transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!loading && !error && fees.length === 0 && (
              <Card className="border border-border/40 border-dashed bg-white/20 dark:bg-zinc-900/20 backdrop-blur-sm rounded-3xl">
                <CardContent className="py-24 text-center space-y-5">
                  <div className="h-24 w-24 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto shadow-inner border border-border/50 rotate-3">
                    <FileText className="h-12 w-12 text-muted-foreground/40 -rotate-3" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-foreground">No Records Found</p>
                    <p className="text-muted-foreground text-sm font-medium max-w-md mx-auto">
                      There are currently no fee records matching your criteria. Try adjusting your filters or create a new entry.
                    </p>
                  </div>
                  {canCreate && (
                    <Button onClick={openCreateModal} className="rounded-xl shadow-lg shadow-primary/20" variant="secondary">
                      <Plus className="h-4 w-4 mr-2" /> Record First Payment
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Global Ledgers States */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="h-16 w-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-2xl relative z-10 border border-border/50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                </div>
                <p className="text-primary font-bold tracking-widest uppercase text-sm animate-pulse">Retrieving Ledger...</p>
              </div>
            )}

            {error && !loading && (
              <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-950/20 rounded-3xl overflow-hidden mt-8 max-w-lg mx-auto shadow-xl shadow-red-500/5">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                  <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Connection Error</h3>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 font-medium">{error}</p>
                  </div>
                  <Button variant="outline" className="rounded-xl border-red-200 hover:bg-red-100 hover:text-red-700 text-red-600 font-bold px-8 shadow-sm" onClick={fetchData}>
                    Retry Connection
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════ FEE STRUCTURES VIEW ═══════════ */}
        {!isStudentView && (
          <TabsContent value="structures" className="space-y-8 mt-0 border-none p-0 outline-none">
            {!structuresLoading && !structuresError && structures.length > 0 && (
              <Card className="border-0 shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-3xl overflow-hidden ring-1 ring-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30 border-b border-border/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14 px-6 rounded-tl-3xl">Structure Name</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Target Class</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Fee Type</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Amount</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Due Date</TableHead>
                        <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs h-14">Installments</TableHead>
                        <TableHead className="text-right font-bold text-muted-foreground uppercase tracking-widest text-xs h-14 px-6 rounded-tr-3xl">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {structures.map((st, idx) => (
                        <TableRow
                          key={st.id}
                          className="hover:bg-background/80 transition-colors border-b border-border/40 group relative"
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          <TableCell className="px-6 py-4">
                            <p className="font-bold text-foreground">{st.name}</p>
                            {st.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">{st.description}</p>}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="bg-muted/50 font-bold px-2.5 py-1">
                              {st.class_name ? `${st.class_name} ${st.section || ''}` : "All Classes"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="font-medium text-sm capitalize">
                              {st.fee_type?.replace(/_/g, ' ')}
                            </p>
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="font-black text-foreground tracking-tight">{formatCurrency(st.amount)}</p>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 text-xs font-medium text-muted-foreground">
                              {st.due_date ? new Date(st.due_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            {st.installments_allowed ? (
                              <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20">Allowed</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground bg-muted/30">Not Allowed</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-6 py-4">
                            <div className="flex items-center justify-end gap-2 relative z-10">
                              {canCreate && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => openEditStructureModal(st)} className="h-8 w-8 rounded-lg hover:bg-blue-100 hover:text-blue-700 text-muted-foreground transition-colors">
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteStructure(st.id)} className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700 text-muted-foreground transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!structuresLoading && !structuresError && structures.length === 0 && (
              <Card className="border border-border/40 border-dashed bg-white/20 dark:bg-zinc-900/20 backdrop-blur-sm rounded-3xl">
                <CardContent className="py-24 text-center space-y-5">
                  <div className="h-24 w-24 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto shadow-inner border border-border/50 rotate-3">
                    <ShieldCheck className="h-12 w-12 text-muted-foreground/40 -rotate-3" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-foreground">No Fee Structures Defined</p>
                    <p className="text-muted-foreground text-sm font-medium max-w-md mx-auto">
                      Create standard fee structures like Tuition, Transport, or Exam fees to easily assign them to classes and streamline collections.
                    </p>
                  </div>
                  {canCreate && (
                    <Button onClick={openCreateStructureModal} className="rounded-xl shadow-lg shadow-purple-600/20 bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4 mr-2" /> Define First Structure
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {structuresLoading && (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </TabsContent>
        )}

      </Tabs>

      {/* Premium Fee Detail Dialog */}
      <Dialog open={!!selectedFee} onOpenChange={(open) => !open && setSelectedFee(null)}>
        <DialogContent className="sm:max-w-lg p-0 border-0 shadow-2xl overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-950">
          {selectedFee && (
            <>
              <div className="bg-gradient-to-br from-muted/50 to-muted/10 p-8 border-b border-border/50 relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Receipt className="w-40 h-40" />
                </div>
                <DialogHeader className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="bg-primary/10 text-primary p-3 rounded-2xl inline-flex custom-shadow-sm border border-primary/20">
                      <Receipt className="h-8 w-8" />
                    </div>
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm font-mono tracking-tight text-xs shadow-sm">
                      {selectedFee.receipt_number || selectedFee.id.split('_')[1]?.substring(0, 8) || 'INV-PENDING'}
                    </Badge>
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black tracking-tight flex flex-col gap-1">
                      <span>Invoice Details</span>
                      <span className="text-lg font-medium text-muted-foreground capitalize">
                        {(selectedFee as FeePayment & { fee_type?: string }).fee_type?.replace(/_/g, ' ') || 'General Fee Payment'}
                      </span>
                    </DialogTitle>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-8 space-y-8 bg-background relative z-10">
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  {selectedFee.student_name && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Billed To</p>
                      <p className="text-base font-bold text-foreground">{selectedFee.student_name}</p>
                      {selectedFee.class_name && (
                        <p className="text-sm font-medium text-muted-foreground">{selectedFee.class_name}</p>
                      )}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                    <div className="pt-1">{getStatusBadge(selectedFee.status)}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                  <div className="bg-muted/30 px-5 py-3 border-b border-border/50 flex justify-between items-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Transaction Summary</p>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-muted-foreground">Original Amount</p>
                      <p className="text-base font-bold text-foreground">{formatCurrency(selectedFee.amount)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-muted-foreground">Amount Paid</p>
                      <p className="text-base font-bold text-emerald-600">{formatCurrency(selectedFee.paid_amount ?? 0)}</p>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <p className="text-base font-black text-foreground">Balance Due</p>
                      <p className="text-2xl font-black text-foreground">{formatCurrency(selectedFee.amount - (selectedFee.paid_amount ?? 0))}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-6 bg-muted/20 p-5 rounded-2xl border border-border/40">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Calendar className="h-3 w-3 " /> Due Date</p>
                    <p className="text-sm font-bold text-foreground">
                      {new Date(selectedFee.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {selectedFee.paid_date && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 " /> Paid Date</p>
                      <p className="text-sm font-bold text-foreground">
                        {new Date(selectedFee.paid_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {selectedFee.payment_method && (
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><CreditCard className="h-3 w-3 " /> Payment Method</p>
                      <p className="text-sm font-bold text-foreground capitalize flex items-center gap-2">
                        {selectedFee.payment_method.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                </div>

                {selectedFee.remarks && (
                  <div className="space-y-2 p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-amber-700/80 dark:text-amber-500/80 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Note
                    </p>
                    <p className="text-sm font-medium text-foreground leading-relaxed">{selectedFee.remarks}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Premium Create / Edit Dialog */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="sm:max-w-xl p-0 border-0 shadow-2xl overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-950">
          <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 border-b border-border/50 relative">
            <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
              {editingFeePayment ? <Edit3 className="w-32 h-32" /> : <Wallet className="w-32 h-32" />}
            </div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md border border-primary/20">
                  {editingFeePayment ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                {editingFeePayment ? "Edit Payment Record" : "New Fee Payment"}
              </DialogTitle>
              <div className="text-sm font-medium text-muted-foreground mt-2">
                {editingFeePayment ? "Update details for an existing fee payment." : "Create a new fee ledger entry securely."}
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5 bg-background relative z-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {formError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:text-primary transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Class <span className="text-red-500">*</span></label>
                <Select value={formData.class_id} onValueChange={handleClassChange}>
                  <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 font-medium">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50 max-h-56">
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 focus-within:text-primary transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Student <span className="text-red-500">*</span></label>
                <Select value={formData.student_id} onValueChange={val => setFormData(p => ({ ...p, student_id: val }))} disabled={!formData.class_id}>
                  <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 font-medium disabled:opacity-50">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50 max-h-56">
                    {formStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.roll_number})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 focus-within:text-primary transition-colors">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fee Type / Structure <span className="text-red-500">*</span></label>
              <Select value={formData.fee_structure_id} onValueChange={handleStructureChange} disabled={!formData.class_id}>
                <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 font-medium disabled:opacity-50">
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl border-border/50 max-h-56">
                  {formStructures.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex justify-between items-center w-full min-w-[200px] gap-4">
                        <span className="capitalize">{f.fee_type.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{f.amount}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:text-primary transition-colors hover:text-primary">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Paid Amount (₹) <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  value={formData.paid_amount}
                  onChange={e => setFormData(p => ({ ...p, paid_amount: e.target.value }))}
                  placeholder="0.00"
                  className="h-11 rounded-xl shadow-sm border-border/60 font-bold text-lg"
                />
              </div>
              <div className="space-y-1.5 focus-within:text-primary transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                <Select value={formData.status} onValueChange={val => setFormData(p => ({ ...p, status: val }))}>
                  <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 font-bold">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50">
                    <SelectItem value="paid" className="font-bold text-emerald-600 focus:text-emerald-700">Paid</SelectItem>
                    <SelectItem value="pending" className="font-bold text-amber-600 focus:text-amber-700">Pending</SelectItem>
                    <SelectItem value="partial" className="font-bold text-blue-600 focus:text-blue-700">Partial</SelectItem>
                    <SelectItem value="overdue" className="font-bold text-red-600 focus:text-red-700">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:text-primary transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                  className="h-11 rounded-xl shadow-sm border-border/60 font-medium"
                />
              </div>
              <div className="space-y-1.5 focus-within:text-primary transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment Method</label>
                <Select value={formData.payment_method} onValueChange={val => setFormData(p => ({ ...p, payment_method: val }))}>
                  <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 font-medium capitalize">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI / Online</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 focus-within:text-primary transition-colors">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Receipt Number</label>
              <Input
                value={formData.receipt_number}
                onChange={e => setFormData(p => ({ ...p, receipt_number: e.target.value }))}
                placeholder="Leave blank to auto-generate"
                className="h-11 rounded-xl shadow-sm border-border/60 font-medium font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5 focus-within:text-primary transition-colors">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Remarks (Optional)</label>
              <Input
                value={formData.remarks}
                onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                placeholder="Any additional notes..."
                className="h-11 rounded-xl shadow-sm border-border/60 font-medium"
              />
            </div>
          </div>

          <div className="p-6 bg-muted/20 border-t border-border/50 flex justify-end gap-3 rounded-b-[2rem]">
            <Button
              variant="outline"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={isSaving}
              className="h-12 px-6 rounded-xl font-bold border-border/60 shadow-sm hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFee}
              disabled={isSaving}
              className="h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : editingFeePayment ? 'Update Record' : 'Create Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Create / Edit Fee Structure Dialog */}
      <Dialog open={isStructureModalOpen} onOpenChange={setIsStructureModalOpen}>
        <DialogContent className="sm:max-w-xl p-0 border-0 shadow-2xl overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-950">
          <div className="bg-gradient-to-br from-purple-600/10 to-transparent p-6 border-b border-border/50 relative">
            <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
              <ShieldCheck className="w-32 h-32" />
            </div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                <div className="bg-purple-600 text-white p-2 rounded-xl shadow-md border border-purple-500/20">
                  {editingStructure ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                {editingStructure ? "Edit Fee Structure" : "New Fee Structure"}
              </DialogTitle>
              <div className="text-sm font-medium text-muted-foreground mt-2">
                {editingStructure ? "Update an existing fee policy." : "Define standard fee policies for consistent billing."}
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5 bg-background relative z-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {formError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:text-purple-600 transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Structure Name <span className="text-red-500">*</span></label>
                <Input
                  value={structFormData.name}
                  onChange={e => setStructFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Standard Tuition Term 1"
                  className="h-11 rounded-xl shadow-sm border-border/60 font-medium"
                />
              </div>

              <div className="space-y-1.5 focus-within:text-purple-600 transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Class</label>
                <Select value={structFormData.class_id} onValueChange={val => setStructFormData(p => ({ ...p, class_id: val === 'all' ? "" : val }))}>
                  <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 font-medium">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50 max-h-56">
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:text-purple-600 transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fee Type <span className="text-red-500">*</span></label>
                <Select value={structFormData.fee_type} onValueChange={val => setStructFormData(p => ({ ...p, fee_type: val }))}>
                  <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 font-medium capitalize">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50">
                    <SelectItem value="tuition">Tuition Fee</SelectItem>
                    <SelectItem value="admission">Admission Fee</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="library">Library</SelectItem>
                    <SelectItem value="exam">Exam Fee</SelectItem>
                    <SelectItem value="hostel">Hostel Fee</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 focus-within:text-purple-600 transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Base Amount (₹) <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  value={structFormData.amount}
                  onChange={e => setStructFormData(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="h-11 rounded-xl shadow-sm border-border/60 font-bold text-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:text-purple-600 transition-colors">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Default Due Date</label>
                <Input
                  type="date"
                  value={structFormData.due_date}
                  onChange={e => setStructFormData(p => ({ ...p, due_date: e.target.value }))}
                  className="h-11 rounded-xl shadow-sm border-border/60 font-medium"
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-center">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Settings</label>
                <div className="flex items-center gap-2 border border-border/50 p-3.5 rounded-xl bg-muted/20">
                  <Switch
                    checked={structFormData.installments_allowed}
                    onCheckedChange={c => setStructFormData(p => ({ ...p, installments_allowed: c }))}
                  />
                  <label className="text-sm font-medium">Allow Installments</label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 focus-within:text-purple-600 transition-colors">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description (Optional)</label>
              <Input
                value={structFormData.description}
                onChange={e => setStructFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Terms or additional details..."
                className="h-11 rounded-xl shadow-sm border-border/60 font-medium"
              />
            </div>
          </div>

          <div className="p-6 bg-muted/20 border-t border-border/50 flex justify-end gap-3 rounded-b-[2rem]">
            <Button
              variant="outline"
              onClick={() => setIsStructureModalOpen(false)}
              disabled={isSaving}
              className="h-12 px-6 rounded-xl font-bold border-border/60 shadow-sm hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveStructure}
              disabled={isSaving}
              className="h-12 px-8 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : editingStructure ? 'Update Structure' : 'Create Structure'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </DashboardLayout >
);
}
