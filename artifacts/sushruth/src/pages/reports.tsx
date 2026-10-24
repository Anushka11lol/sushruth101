import { useState, useRef } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReports,
  useCreateReport,
  useGetReport,
  useDeleteReport,
  useExtractReportImage,
  getListReportsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/context/LanguageContext";
import { CameraCaptureDialog } from "@/components/CameraCaptureDialog";
import {
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Stethoscope,
  Camera,
  Upload,
  X,
  ImageIcon,
  Loader2,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

const REPORT_TYPES: { value: string; label: string }[] = [
  { value: "blood_test", label: "Blood Test" },
  { value: "urine_test", label: "Urine Test" },
  { value: "xray", label: "X-Ray" },
  { value: "mri", label: "MRI" },
  { value: "ct_scan", label: "CT Scan" },
  { value: "ecg", label: "ECG" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "prescription", label: "Prescription" },
  { value: "discharge_summary", label: "Discharge Summary" },
  { value: "other", label: "Other" },
];

const REPORT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_TYPES.map(({ value, label }) => [value, label])
);

/**
 * Converts any image file to a JPEG base64 string via canvas.
 * Handles HEIC, BMP, WebP, and all other browser-decodable formats.
 * Claude only accepts jpeg/png/gif/webp — JPEG is always safe.
 */
function fileToJpegBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

export default function ReportsPage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  const [showForm, setShowForm] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ reportType: "", title: "", rawText: "" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractDone, setExtractDone] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: reports, isLoading } = useListReports({ userId }, { query: { enabled: !!userId } as any });
  const { data: viewingReport } = useGetReport(viewingId ?? 0, { query: { enabled: !!viewingId } as any });
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();
  const extractImage = useExtractReportImage();

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setImageFile(file);
    setExtractDone(false);

    if (file.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    } else {
      setImagePreview(null);
    }

    if (file.type.startsWith("image/")) {
      setExtracting(true);
      setExtractError(null);
      try {
        const { base64, mimeType: jpegMime } = await fileToJpegBase64(file);
        const result = await extractImage.mutateAsync({
          data: { imageBase64: base64, mimeType: jpegMime, language: language.aiName } as any,
        });
        if (result.extractedText) {
          setFormData((p) => ({ ...p, rawText: result.extractedText }));
          setExtractDone(true);
        } else {
          setExtractError("Claude could not read any text from this image. Try a clearer, well-lit photo.");
        }
      } catch {
        setExtractError("Could not extract text — please check your connection and try again, or type the content manually.");
      } finally {
        setExtracting(false);
      }
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExtractDone(false);
    setExtractError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!formData.reportType || !formData.title || !userId) return;
    await createReport.mutateAsync({ data: { userId, ...formData, language: language.aiName } as any });
    queryClient.invalidateQueries({ queryKey: getListReportsQueryKey({ userId }) });
    setShowForm(false);
    setFormData({ reportType: "", title: "", rawText: "" });
    clearImage();
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    await deleteReport.mutateAsync({ id: deleteConfirmId });
    queryClient.invalidateQueries({ queryKey: getListReportsQueryKey({ userId }) });
    setDeleteConfirmId(null);
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({ reportType: "", title: "", rawText: "" });
    clearImage();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medical Reports</h1>
          <p className="text-muted-foreground mt-1">Upload, photograph, and get AI-simplified explanations of your reports.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Report
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !reports || reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="font-semibold mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a photo of your report or paste the text — our AI will explain it in simple terms.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Your First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewingId(r.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-700 shrink-0">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground truncate">{r.title}</p>
                      <Badge variant="secondary" className="text-xs shrink-0">{REPORT_TYPE_LABEL[r.reportType] ?? r.reportType}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {new Date(r.createdAt).toLocaleDateString("en-IN")}
                      </span>
                      {r.specialistSuggestion && (
                        <span className="flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" aria-hidden="true" />
                          {r.specialistSuggestion}
                        </span>
                      )}
                      {r.abnormalValues && r.abnormalValues !== "All values within normal range." && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          Abnormal values found
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(r.id); }}
                      aria-label={`Delete report: ${r.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Report Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Medical Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Camera / Upload buttons */}
            <div>
              <Label className="mb-2 block">Upload or Photograph Report</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-col h-20 gap-1.5 text-xs"
                  onClick={() => setCameraOpen(true)}
                  aria-label="Take a photo of your report using the camera"
                >
                  <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span>Take Photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-col h-20 gap-1.5 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload a file from your device"
                >
                  <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span>Upload File</span>
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                aria-hidden="true"
              />
            </div>
            <CameraCaptureDialog
              open={cameraOpen}
              onOpenChange={setCameraOpen}
              onCapture={handleFileSelect}
              title="Photograph Medical Report"
            />

            {/* Image preview + extraction status */}
            {imageFile && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                    <span className="text-xs text-foreground font-medium truncate">{imageFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={clearImage}
                    aria-label="Remove selected file"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Report preview"
                    className="w-full max-h-40 object-contain rounded-lg border border-border bg-white"
                  />
                )}
                {extracting && (
                  <div className="flex items-center gap-2 text-xs text-primary" role="status" aria-live="polite">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Sushruth is reading your report…
                  </div>
                )}
                {extractDone && (
                  <div className="flex items-center gap-2 text-xs text-green-700" role="status" aria-live="polite">
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Sushruth has read your report — review below and submit
                  </div>
                )}
                {extractError && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2" role="alert" aria-live="assertive">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    {extractError}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or type the report details</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div>
              <Label htmlFor="rpt-type">Report Type</Label>
              <Select value={formData.reportType} onValueChange={(v) => setFormData((p) => ({ ...p, reportType: v }))}>
                <SelectTrigger id="rpt-type" className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rpt-title">Report Title</Label>
              <Input
                id="rpt-title"
                className="mt-1"
                placeholder="E.g. CBC Report - May 2026"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="rpt-text">
                Report Content
                {extractDone && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    (auto-filled from image — review & edit if needed)
                  </span>
                )}
              </Label>
              <Textarea
                id="rpt-text"
                className="mt-1 min-h-[120px]"
                placeholder="Paste or type the report content here, or use the camera/upload buttons above to auto-fill…"
                value={formData.rawText}
                onChange={(e) => setFormData((p) => ({ ...p, rawText: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.reportType || !formData.title || createReport.isPending || extracting}
            >
              {createReport.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Analyzing…</>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              Delete Report
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This report and its AI analysis will be permanently deleted. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteReport.isPending}>
              {deleteReport.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View report dialog */}
      <Dialog open={!!viewingId} onOpenChange={(open) => !open && setViewingId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingReport?.title ?? "Report Details"}</DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{REPORT_TYPE_LABEL[viewingReport.reportType] ?? viewingReport.reportType}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(viewingReport.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
              {viewingReport.simplifiedText && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">AI Explanation</h4>
                  <p className="text-sm text-foreground leading-relaxed bg-muted/50 rounded-lg p-3">
                    {viewingReport.simplifiedText}
                  </p>
                </div>
              )}
              {viewingReport.abnormalValues && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" aria-hidden="true" />
                    Abnormal Values
                  </h4>
                  <div className={`rounded-lg p-3 text-sm leading-relaxed ${viewingReport.abnormalValues === "All values within normal range." ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-800"}`}>
                    {viewingReport.abnormalValues}
                  </div>
                </div>
              )}
              {viewingReport.specialistSuggestion && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Specialist Suggestion</p>
                  <p className="text-sm text-blue-900">{viewingReport.specialistSuggestion}</p>
                </div>
              )}
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <AlertDescription className="text-xs text-amber-800">
                  AI Disclaimer: This is not a medical diagnosis. Please consult a certified doctor for proper interpretation of your reports.
                </AlertDescription>
              </Alert>
              {viewingReport.rawText && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium mb-2">View Original Text</summary>
                  <pre className="whitespace-pre-wrap bg-muted/50 rounded p-3 font-mono">{viewingReport.rawText}</pre>
                </details>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
