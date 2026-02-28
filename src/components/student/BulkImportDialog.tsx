import { useState, useCallback } from "react";
import { UploadCloud, FileSpreadsheet, AlertCircle, Loader2, CheckCircle2, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as Papa from "papaparse";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { bulkCreateStudents } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BulkImportDialogProps {
    onSuccess: () => void;
}

interface ParsedStudent {
    name: string;
    email: string;
    roll_number: string;
    class_id?: string;
    admission_date?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    phone?: string;
    blood_group?: string;
}

export function BulkImportDialog({ onSuccess }: BulkImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [importErrors, setImportErrors] = useState<any[]>([]);
    const { toast } = useToast();

    const parseFile = (file: File) => {
        setIsParsing(true);
        setImportErrors([]);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Map CSV headers to ParsedStudent object keys
                const formattedData = results.data.map((row: any) => ({
                    name: row.name || row.Name || "",
                    email: row.email || row.Email || "",
                    roll_number: row.roll_number || row.RollNumber || row['Roll Number'] || "",
                    gender: row.gender || row.Gender || undefined,
                    phone: row.phone || row.Phone || undefined,
                    blood_group: row.blood_group || row.BloodGroup || row['Blood Group'] || undefined,
                    address: row.address || row.Address || undefined,
                })).filter(s => s.name && s.email && s.roll_number); // Rough filter, backend validates fully

                setParsedData(formattedData);
                setIsParsing(false);
            },
            error: (error: any) => {
                toast({ title: "Parsing Error", description: error.message, variant: "destructive" });
                setIsParsing(false);
            }
        });
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            parseFile(acceptedFiles[0]);
        }
    }, [parseFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv']
        },
        maxFiles: 1
    });

    const handleReset = () => {
        setFile(null);
        setParsedData([]);
        setImportErrors([]);
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;
        setIsSubmitting(true);
        setImportErrors([]);

        try {
            const res = await bulkCreateStudents({ students: parsedData });
            if (res.success) {
                toast({ title: "Import Successful", description: res.data?.message || `Successfully imported students.` });
                if (res.data?.errors && res.data.errors.length > 0) {
                    setImportErrors(res.data.errors);
                } else {
                    setOpen(false);
                    handleReset();
                    onSuccess();
                }
            }
        } catch (err: any) {
            // Support for our ApiError returning JSON with errors array
            if (err.errorData?.errors) {
                setImportErrors(err.errorData.errors);
                toast({ title: "Import Completed with Errors", description: "Some rows failed to import. See details.", variant: "destructive" });
            } else {
                toast({ title: "Import Failed", description: err.message || "An unexpected error occurred", variant: "destructive" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent = "name,email,roll_number,gender,phone,blood_group,address\nJohn Doe,john@example.com,R1001,Male,1234567890,O+,123 Main St";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "student_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleReset();
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="shrink-0 rounded-xl shadow-sm">
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Bulk Import
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import Students via CSV</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk import student records. Download the template to ensure correct column formats.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                            <div className="text-sm">
                                <p className="font-medium">Need a template?</p>
                                <p className="text-muted-foreground text-xs">Download the CSV template with required headers</p>
                            </div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={downloadTemplate}>Download CSV</Button>
                    </div>

                    {!file ? (
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-sidebar-foreground/30 hover:bg-muted/30'}`}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <UploadCloud className="h-8 w-8 mb-2 text-primary" />
                                <p className="text-sm font-medium text-foreground">Click or drag CSV file to upload</p>
                                <p className="text-xs">Only .csv files are supported</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 border rounded-lg bg-background">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {isParsing ? "Parsing..." : `${parsedData.length} valid rows found`}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={handleReset} disabled={isSubmitting}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {parsedData.length > 0 && !isSubmitting && importErrors.length === 0 && (
                                <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-lg text-sm flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                                    <div>
                                        <p className="font-medium">File parsed successfully!</p>
                                        <p className="text-xs opacity-90">Ready to import {parsedData.length} student records.</p>
                                    </div>
                                </div>
                            )}

                            {importErrors.length > 0 && (
                                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm space-y-2 max-h-[150px] overflow-y-auto">
                                    <div className="flex items-center gap-2 font-medium">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Import Errors ({importErrors.length})</span>
                                    </div>
                                    <ul className="list-disc pl-6 text-xs space-y-1">
                                        {importErrors.map((err, i) => (
                                            <li key={i}>Row {err.row}: {err.error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button
                        disabled={!file || parsedData.length === 0 || isSubmitting || importErrors.length > 0}
                        onClick={handleImport}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {importErrors.length > 0 ? 'Fix Errors' : 'Import Students'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
