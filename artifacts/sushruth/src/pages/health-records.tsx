import {
  getOfflineQueue,
  type OfflineQueueItem,
  queueOfflineRecord,
  syncOfflineQueue,
} from "@/lib/offline-sync";
import { useState, useEffect, useMemo, useRef } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetHealthRecord,
  useCreateHealthRecord,
  useListSurgeries,
  useCreateSurgery,
  useDeleteSurgery,
  useAnalyzeHealthDocument,
  useAnalyzeHealthPatterns,
  useListTriageSessions,
  useListReports,
  getGetHealthRecordQueryKey,
  getListSurgeriesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  HeartPulse,
  Plus,
  Edit2,
  Trash2,
  Droplets,
  Activity,
  Phone,
  Ruler,
  Scissors,
  Calendar,
  Building,
  User,
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  FileText,
  Sparkles,
  AlertTriangle,
  X,
  ShieldCheck,
  BrainCircuit,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { CameraCaptureDialog } from "@/components/CameraCaptureDialog";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

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

type AnalysisResult = {
  extractedText: string;
  documentType: string;
  summary: string;
  suggestedMedications: string;
  suggestedConditions: string;
  suggestedAllergies: string;
};

type PatternAnalysis = {
  patterns: Array<{
    title: string;
    observation: string;
    evidenceCount: number;
    confidence: "possible" | "recurring";
    caution: string;
  }>;
  analyzedAt: string;
  disclaimer: string;
};

type HealthHistoryEvent = {
  sourceType: "triage" | "report" | "pre_consultation";
  sourceId: string;
  occurredAt: string;
  text: string;
  title: string;
};

export default function HealthRecordsPage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  const [editing, setEditing] = useState(false);
  const [showSurgeryForm, setShowSurgeryForm] = useState(false);
  const [deleteSurgeryId, setDeleteSurgeryId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    bloodGroup: "",
    allergies: "",
    chronicConditions: "",
    currentMedications: "",
    emergencyContact: "",
    height: "",
    weight: "",
  });
  const [surgeryForm, setSurgeryForm] = useState({
    procedureName: "",
    date: "",
    hospital: "",
    surgeon: "",
    notes: "",
  });

  // Document scan state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [scanImagePreview, setScanImagePreview] = useState<string | null>(null);
  const [scanFileName, setScanFileName] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null);
  const [patternError, setPatternError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPatternRequestRef = useRef("");

  const { data: record, isLoading } = useGetHealthRecord(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const { data: surgeries, isLoading: surgsLoading } = useListSurgeries(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const { data: triageSessions } = useListTriageSessions(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const { data: reports } = useListReports(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const createRecord = useCreateHealthRecord();
  const createSurgery = useCreateSurgery();
  const deleteSurgery = useDeleteSurgery();
  const analyzeDocument = useAnalyzeHealthDocument();
  const analyzePatterns = useAnalyzeHealthPatterns();
  type HealthRecordPayload = Parameters<typeof createRecord.mutateAsync>[0]["data"];
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem<HealthRecordPayload>[]>([]);
  const [offlineQueueError, setOfflineQueueError] = useState<string | null>(null);
  const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState(false);
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  const refreshOfflineQueue = () => {
    if (!userId) {
      setOfflineQueue([]);
      return;
    }
    try {
      setOfflineQueue(getOfflineQueue<HealthRecordPayload>(userId));
      setOfflineQueueError(null);
    } catch {
      setOfflineQueueError("Saved offline data could not be read. It has not been changed.");
    }
  };

  const retryOfflineQueue = async () => {
    if (!userId || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    if (isSyncingOfflineQueue) return;
    setIsSyncingOfflineQueue(true);
    setOfflineQueueError(null);
    try {
      const result = await syncOfflineQueue<HealthRecordPayload>(
        userId,
        (payload) => createRecord.mutateAsync({ data: payload }),
      );
      refreshOfflineQueue();
      if (result.synced > 0) {
        void queryClient.invalidateQueries({
          queryKey: getGetHealthRecordQueryKey({ userId }),
        });
      }
      if (result.failed > 0) {
        setOfflineQueueError("A saved change could not sync. It remains available to retry.");
      }
    } catch {
      refreshOfflineQueue();
      setOfflineQueueError("Saved offline data could not be synced. It remains available to retry.");
    } finally {
      setIsSyncingOfflineQueue(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void retryOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("storage", refreshOfflineQueue);
    refreshOfflineQueue();
    if (navigator.onLine) void retryOfflineQueue();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", refreshOfflineQueue);
    };
  }, [userId]);

  const healthHistory = useMemo<HealthHistoryEvent[]>(() => {
    const events: HealthHistoryEvent[] = [];
    for (const session of triageSessions ?? []) {
      events.push({
        sourceType: "triage",
        sourceId: String(session.id),
        occurredAt: session.createdAt,
        title: "AI triage",
        text: [
          `Patient reported: ${session.symptoms}`,
          session.aiSummary ? `Triage summary: ${session.aiSummary}` : "",
          `Urgency: ${session.urgencyLevel}`,
        ].filter(Boolean).join("\n"),
      });
    }
    for (const report of reports ?? []) {
      events.push({
        sourceType: "report",
        sourceId: String(report.id),
        occurredAt: report.createdAt,
        title: report.title,
        text: [
          `Report type: ${report.reportType}`,
          report.rawText ? `Report text: ${report.rawText}` : "",
          report.simplifiedText ? `Simplified summary: ${report.simplifiedText}` : "",
          report.abnormalValues ? `Values marked abnormal in the report: ${report.abnormalValues}` : "",
        ].filter(Boolean).join("\n"),
      });
    }
    try {
      const saved = localStorage.getItem(`sushruth_intake_${userId}`);
      const intake = saved ? JSON.parse(saved) : null;
      if (intake?.stage >= 9) {
        events.push({
          sourceType: "pre_consultation",
          sourceId: String(intake.submittedAt ?? intake.updatedAt ?? "latest"),
          occurredAt: intake.submittedAt ?? intake.updatedAt ?? intake.startedAt ?? new Date().toISOString(),
          title: "Pre-consultation history",
          text: [
            `Patient reported: ${intake.mainProblem?.complaint ?? ""}`,
            `Onset: ${intake.mainProblem?.onset ?? ""}`,
            `Severity: ${intake.mainProblem?.severity ?? ""}`,
            ...Object.entries(intake.hpi?.answers ?? {}).map(([question, answer]) => `${question}: ${String(answer)}`),
            intake.ayush?.triggers ? `Reported triggers: ${intake.ayush.triggers}` : "",
            intake.ayush?.progression ? `Reported progression: ${intake.ayush.progression}` : "",
          ].filter(Boolean).join("\n"),
        });
      }
    } catch {
      // A damaged local draft should not block the server-backed health history.
    }
    return events
      .filter((event) => event.text.trim())
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [triageSessions, reports, userId]);

  const patternFingerprint = useMemo(
    () => healthHistory.map((event) => `${event.sourceType}:${event.sourceId}:${event.text}`).join("|"),
    [healthHistory],
  );

  const runPatternAnalysis = async (force = false) => {
    if (!userId || healthHistory.length < 2 || (!force && lastPatternRequestRef.current === patternFingerprint)) return;
    lastPatternRequestRef.current = patternFingerprint;
    setPatternError(null);
    try {
      const result = await analyzePatterns.mutateAsync({
        data: {
          userId,
          language: language.code,
          events: healthHistory.slice(0, 50).map(({ sourceType, sourceId, occurredAt, text }) => ({
            sourceType,
            sourceId,
            occurredAt,
            text,
          })),
        },
      });
      setPatternAnalysis(result);
      localStorage.setItem(
        `sushruth_health_patterns_${userId}`,
        JSON.stringify({ fingerprint: patternFingerprint, language: language.code, result }),
      );
    } catch {
      setPatternError("Sushruth could not compare your history right now. Your saved records are still available below.");
    }
  };

  useEffect(() => {
    if (!userId || healthHistory.length < 2) return;
    try {
      const cached = JSON.parse(localStorage.getItem(`sushruth_health_patterns_${userId}`) ?? "null");
      if (cached?.fingerprint === patternFingerprint && cached?.language === language.code) {
        setPatternAnalysis(cached.result);
        lastPatternRequestRef.current = patternFingerprint;
        return;
      }
    } catch {
      // Ignore an invalid cache and generate a fresh comparison.
    }
    void runPatternAnalysis();
  }, [userId, patternFingerprint, language.code]);

  useEffect(() => {
    if (record) {
      setFormData({
        bloodGroup: record.bloodGroup ?? "",
        allergies: record.allergies ?? "",
        chronicConditions: record.chronicConditions ?? "",
        currentMedications: record.currentMedications ?? "",
        emergencyContact: record.emergencyContact ?? "",
        height: record.height ? String(record.height) : "",
        weight: record.weight ? String(record.weight) : "",
      });
    }
  }, [record]);

  const handleSaveRecord = async () => {
    if (!userId) return;
    const payload = {
      userId,
      ...formData,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
    };

    try {
      // Persist before attempting the network so a lost response remains retryable.
      queueOfflineRecord<HealthRecordPayload>(userId, payload);
      refreshOfflineQueue();
      setEditing(false);
      if (isOnline) await retryOfflineQueue();
    } catch {
      setOfflineQueueError("This change could not be saved locally. Keep this form open and try again.");
    }
  };

  const handleAddSurgery = async () => {
    if (!surgeryForm.procedureName || !surgeryForm.date || !userId) return;
    await createSurgery.mutateAsync({ data: { userId, ...surgeryForm } });
    queryClient.invalidateQueries({ queryKey: getListSurgeriesQueryKey({ userId }) });
    setShowSurgeryForm(false);
    setSurgeryForm({ procedureName: "", date: "", hospital: "", surgeon: "", notes: "" });
  };

  const handleDeleteSurgery = async () => {
    if (deleteSurgeryId === null) return;
    await deleteSurgery.mutateAsync({ id: deleteSurgeryId });
    queryClient.invalidateQueries({ queryKey: getListSurgeriesQueryKey({ userId }) });
    setDeleteSurgeryId(null);
  };

  // Apply AI suggestions to the edit form
  const handleApplySuggestions = () => {
    if (!analysisResult) return;
    const merged = {
      medications: [formData.currentMedications, analysisResult.suggestedMedications]
        .filter(Boolean).join(", "),
      conditions: [formData.chronicConditions, analysisResult.suggestedConditions]
        .filter(Boolean).join(", "),
      allergies: [formData.allergies, analysisResult.suggestedAllergies]
        .filter(Boolean).join(", "),
    };
    setFormData((p) => ({
      ...p,
      currentMedications: merged.medications || p.currentMedications,
      chronicConditions: merged.conditions || p.chronicConditions,
      allergies: merged.allergies || p.allergies,
    }));
    setApplySuccess(true);
    setEditing(true);
    setTimeout(() => setApplySuccess(false), 3000);
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setScanFileName(file.name);
    setScanImagePreview(URL.createObjectURL(file));
    setAnalysisResult(null);
    setAnalysisError(null);
    setApplySuccess(false);
    setAnalyzing(true);
    try {
      const { base64, mimeType: jpegMime } = await fileToJpegBase64(file);
      const result = await analyzeDocument.mutateAsync({
        data: { imageBase64: base64, mimeType: jpegMime, language: language.aiName } as any,
      });
      setAnalysisResult(result);
    } catch {
      setAnalysisError("Could not read the document — please try a clearer, well-lit image or check your connection.");
    } finally {
      setAnalyzing(false);
    }
  };

  const clearScan = () => {
    setScanImagePreview(null);
    setScanFileName(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setApplySuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Health Records</h1>
          <p className="text-muted-foreground mt-1">Your complete medical profile.</p>
        </div>
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Edit2 className="mr-2 h-4 w-4" aria-hidden="true" />
          {record ? "Edit Profile" : "Create Profile"}
        </Button>
      </div>

      <Card className="border-indigo-200 bg-indigo-50/30" data-sr-description="Health history insights. This section combines completed triage, reports, and pre-consultation history, then looks for repeated observations without diagnosing you.">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                <BrainCircuit className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                Health History Insights
              </CardTitle>
              <p className="text-xs text-indigo-800 mt-1 max-w-2xl">
                Completed triage, report processing, and pre-consultation history automatically appear here. Sushruth compares them only when your history changes.
              </p>
            </div>
            {healthHistory.length >= 2 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runPatternAnalysis(true)}
                disabled={analyzePatterns.isPending}
                className="border-indigo-300 bg-white text-indigo-800"
                data-sr-description="Check again. Compare your saved health history for repeated symptoms or circumstances. This does not diagnose a condition."
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${analyzePatterns.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
                Check again
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthHistory.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Add at least two completed triage sessions, reports, or patient histories before Sushruth can look for a repeated pattern.
            </p>
          ) : analyzePatterns.isPending && !patternAnalysis ? (
            <div className="flex items-center gap-2 text-sm text-indigo-800" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Comparing your saved history for repeated observations…
            </div>
          ) : patternError ? (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <AlertDescription className="text-sm text-amber-900">{patternError}</AlertDescription>
            </Alert>
          ) : patternAnalysis?.patterns.length ? (
            <div className="space-y-3" aria-live="polite">
              {patternAnalysis.patterns.map((pattern, index) => (
                <div key={`${pattern.title}-${index}`} className="rounded-xl border border-indigo-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-indigo-950">{pattern.title}</p>
                    <Badge variant="outline" className="border-indigo-200 text-indigo-800">
                      Seen in {pattern.evidenceCount} records
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">{pattern.observation}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{pattern.caution}</p>
                </div>
              ))}
              <p className="text-xs text-indigo-800">{patternAnalysis.disclaimer}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <p className="text-sm font-medium text-indigo-950">No clear repeated pattern yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your records are still shown below. Sushruth will check again after a new completed history, triage, or report is added.
              </p>
            </div>
          )}

          <div className="border-t border-indigo-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900 mb-2">Recent health activity</p>
            <div className="space-y-2">
              {healthHistory.slice(0, 5).map((event) => (
                <div key={`${event.sourceType}-${event.sourceId}`} className="flex items-start gap-3 rounded-lg bg-white border border-indigo-100 px-3 py-2">
                  <Clock3 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleDateString(language.sttCode, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
              {healthHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No completed health activity yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Document Scanner */}
      <Card className="border-teal-200 bg-teal-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-teal-800">
            <Sparkles className="h-4 w-4 text-teal-600" aria-hidden="true" />
            Scan Prescription or Report
          </CardTitle>
          <p className="text-xs text-teal-700">
            Take a photo or upload a prescription/medical document — AI will read it and suggest updates to your health profile.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-col h-16 gap-1 text-xs border-teal-300 bg-white hover:bg-teal-50"
              onClick={() => setCameraOpen(true)}
              aria-label="Take a photo of your prescription or document"
            >
              <Camera className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <span className="text-teal-700">Take Photo</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-col h-16 gap-1 text-xs border-teal-300 bg-white hover:bg-teal-50"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload a prescription or medical document file"
            >
              <Upload className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <span className="text-teal-700">Upload File</span>
            </Button>
          </div>

          <CameraCaptureDialog
            open={cameraOpen}
            onOpenChange={setCameraOpen}
            onCapture={handleFileSelect}
            title="Photograph Prescription or Report"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            aria-hidden="true"
          />

          {/* Image preview + analysis */}
          {scanFileName && (
            <div className="rounded-xl border border-teal-200 bg-white p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground truncate">{scanFileName}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearScan} aria-label="Remove scanned document">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>

              {scanImagePreview && (
                <img
                  src={scanImagePreview}
                  alt="Scanned document preview"
                  className="w-full max-h-40 object-contain rounded-lg border border-border bg-white"
                />
              )}

              {analyzing && (
                <div className="flex items-center gap-2 text-xs text-teal-700" role="status" aria-live="polite">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Sushruth is reading your prescription…
                </div>
              )}

              {analysisError && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2" role="alert" aria-live="assertive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  {analysisError}
                </div>
              )}

              {analysisResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-green-700" role="status" aria-live="polite">
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="font-medium">{analysisResult.documentType} detected</span>
                  </div>

                  <div className="rounded-lg bg-teal-50 border border-teal-200 p-3 text-sm text-teal-900 leading-relaxed">
                    {analysisResult.summary}
                  </div>

                  {(analysisResult.suggestedMedications || analysisResult.suggestedConditions || analysisResult.suggestedAllergies) && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Found in document:</p>
                      {analysisResult.suggestedMedications && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Medications</p>
                          <div className="flex flex-wrap gap-1">
                            {analysisResult.suggestedMedications.split(",").map((m) => (
                              <Badge key={m} variant="secondary" className="text-xs font-normal">{m.trim()}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysisResult.suggestedConditions && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Conditions / Diagnoses</p>
                          <div className="flex flex-wrap gap-1">
                            {analysisResult.suggestedConditions.split(",").map((c) => (
                              <Badge key={c} variant="outline" className="text-xs font-normal">{c.trim()}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysisResult.suggestedAllergies && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Allergies</p>
                          <div className="flex flex-wrap gap-1">
                            {analysisResult.suggestedAllergies.split(",").map((a) => (
                              <Badge key={a} variant="destructive" className="text-xs font-normal">{a.trim()}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {applySuccess ? (
                        <div className="flex items-center gap-2 text-xs text-green-700" role="status" aria-live="polite">
                          <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Applied to your profile — review and save below
                        </div>
                      ) : (
                        <Button size="sm" className="mt-1 bg-teal-700 hover:bg-teal-800 text-white gap-2" onClick={handleApplySuggestions}>
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          Apply to Health Profile
                        </Button>
                      )}
                    </div>
                  )}

                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                    <AlertDescription className="text-xs text-amber-800">
                      Always verify AI-extracted information with your doctor before relying on it.
                    </AlertDescription>
                  </Alert>

                  {analysisResult.extractedText && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium mb-1">View raw extracted text</summary>
                      <pre className="whitespace-pre-wrap bg-muted/50 rounded p-2 font-mono mt-1 text-xs">{analysisResult.extractedText}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(offlineQueue.length > 0 || offlineQueueError) && (
        <Alert
          className="border-teal-200 bg-teal-50/50"
          data-testid="status-offline-health-records"
        >
          <Clock3 className="h-4 w-4 text-teal-700" aria-hidden="true" />
          <AlertTitle>Health record sync</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Offline changes are stored in this browser and are not encrypted.
              This is a prototype; use synthetic health data only.
            </p>
            {offlineQueueError && (
              <p role="status" data-testid="text-offline-sync-error">
                {offlineQueueError}
              </p>
            )}
            <ul className="space-y-2">
              {offlineQueue.map((item) => (
                <li
                  key={item.localId}
                  className="flex items-center justify-between gap-3 text-sm"
                  data-testid={`status-offline-record-${item.localId}`}
                >
                  <span>Saved change</span>
                  <Badge variant={item.status === "Failed" ? "destructive" : "outline"}>
                    {item.status}
                  </Badge>
                </li>
              ))}
            </ul>
            {offlineQueue.some((item) => item.status !== "Synced") && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void retryOfflineQueue()}
                disabled={!isOnline || isSyncingOfflineQueue}
                data-testid="button-retry-offline-sync"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingOfflineQueue ? "animate-spin" : ""}`} aria-hidden="true" />
                {isSyncingOfflineQueue ? "Syncing…" : isOnline ? "Retry sync" : "Waiting for connection"}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Health Profile Card */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !record ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HeartPulse className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="font-semibold mb-2">No health profile yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your health profile so doctors can quickly understand your medical history.
            </p>
            <Button onClick={() => setEditing(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create Health Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-border">
          <CardHeader className="bg-muted/30 rounded-t-lg border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {user?.firstName?.charAt(0) ?? "P"}
                </div>
                <div>
                  <CardTitle className="text-base">{user?.fullName ?? "Patient"}</CardTitle>
                  <p className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Medical Record</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <Droplets className="h-4 w-4 text-red-600 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">Blood Group</p>
                <p className="font-bold text-lg text-red-700">{record.bloodGroup ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <Ruler className="h-4 w-4 text-blue-600 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">Height</p>
                <p className="font-bold text-lg text-blue-700">
                  {record.height ? `${record.height} cm` : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <Activity className="h-4 w-4 text-green-600 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">Weight</p>
                <p className="font-bold text-lg text-green-700">
                  {record.weight ? `${record.weight} kg` : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3 text-center">
                <Phone className="h-4 w-4 text-orange-600 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">Emergency</p>
                <p className="font-bold text-xs text-orange-700 truncate">
                  {record.emergencyContact ?? "—"}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              {record.allergies && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {record.allergies.split(",").map((a) => (
                      <Badge key={a} variant="destructive" className="text-xs font-normal">{a.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {record.chronicConditions && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Chronic Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {record.chronicConditions.split(",").map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs font-normal">{c.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {record.currentMedications && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Current Medications</p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-2">{record.currentMedications}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Surgeries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4" aria-hidden="true" />
            Past Surgeries & Procedures
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowSurgeryForm(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {surgsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !surgeries || surgeries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No surgery records added.</p>
          ) : (
            <div className="space-y-3">
              {surgeries.map((s) => (
                <div key={s.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="rounded-lg bg-purple-50 p-1.5 text-purple-700 shrink-0">
                    <Scissors className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{s.procedureName}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {s.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {new Date(s.date).toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
                        </span>
                      )}
                      {s.hospital && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" aria-hidden="true" />
                          {s.hospital}
                        </span>
                      )}
                      {s.surgeon && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" aria-hidden="true" />
                          {s.surgeon}
                        </span>
                      )}
                    </div>
                    {s.notes && <p className="text-xs text-muted-foreground mt-1 italic">{s.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => setDeleteSurgeryId(s.id)}
                    aria-label={`Delete surgery record: ${s.procedureName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Health Profile Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{record ? "Edit Health Profile" : "Create Health Profile"}</DialogTitle>
          </DialogHeader>
          {applySuccess && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2" role="status" aria-live="polite">
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              AI suggestions applied — review and save your profile
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Blood Group</Label>
                <Select value={formData.bloodGroup} onValueChange={(v) => setFormData((p) => ({ ...p, bloodGroup: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input className="mt-1" type="number" placeholder="170" value={formData.height} onChange={(e) => setFormData((p) => ({ ...p, height: e.target.value }))} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input className="mt-1" type="number" placeholder="65" value={formData.weight} onChange={(e) => setFormData((p) => ({ ...p, weight: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Allergies (comma-separated)</Label>
              <Input className="mt-1" placeholder="Penicillin, Peanuts, Dust" value={formData.allergies} onChange={(e) => setFormData((p) => ({ ...p, allergies: e.target.value }))} />
            </div>
            <div>
              <Label>Chronic Conditions (comma-separated)</Label>
              <Input className="mt-1" placeholder="Diabetes Type 2, Hypertension" value={formData.chronicConditions} onChange={(e) => setFormData((p) => ({ ...p, chronicConditions: e.target.value }))} />
            </div>
            <div>
              <Label>Current Medications</Label>
              <Textarea className="mt-1" placeholder="Metformin 500mg twice daily..." value={formData.currentMedications} onChange={(e) => setFormData((p) => ({ ...p, currentMedications: e.target.value }))} />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input className="mt-1" placeholder="Name: +91 98765 43210" value={formData.emergencyContact} onChange={(e) => setFormData((p) => ({ ...p, emergencyContact: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveRecord} disabled={createRecord.isPending || isSyncingOfflineQueue}>
              {createRecord.isPending || isSyncingOfflineQueue ? "Saving…" : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Surgery Dialog */}
      <Dialog open={showSurgeryForm} onOpenChange={setShowSurgeryForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Surgery / Procedure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Procedure Name</Label>
              <Input className="mt-1" placeholder="Appendectomy" value={surgeryForm.procedureName} onChange={(e) => setSurgeryForm((p) => ({ ...p, procedureName: e.target.value }))} />
            </div>
            <div>
              <Label>Date</Label>
              <Input className="mt-1" type="date" value={surgeryForm.date} onChange={(e) => setSurgeryForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <Label>Hospital</Label>
              <Input className="mt-1" placeholder="Apollo Hospital, Chennai" value={surgeryForm.hospital} onChange={(e) => setSurgeryForm((p) => ({ ...p, hospital: e.target.value }))} />
            </div>
            <div>
              <Label>Surgeon</Label>
              <Input className="mt-1" placeholder="Dr. Rajan Kumar" value={surgeryForm.surgeon} onChange={(e) => setSurgeryForm((p) => ({ ...p, surgeon: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" placeholder="Any additional notes..." value={surgeryForm.notes} onChange={(e) => setSurgeryForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSurgeryForm(false)}>Cancel</Button>
            <Button onClick={handleAddSurgery} disabled={!surgeryForm.procedureName || !surgeryForm.date || createSurgery.isPending}>
              {createSurgery.isPending ? "Saving…" : "Add Surgery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Surgery Confirm Dialog */}
      <Dialog open={deleteSurgeryId !== null} onOpenChange={(open) => !open && setDeleteSurgeryId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              Delete Surgery Record
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This surgery record will be permanently deleted. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSurgeryId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSurgery} disabled={deleteSurgery.isPending}>
              {deleteSurgery.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
