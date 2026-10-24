import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPrescriptions,
  useCreatePrescription,
  useExtractPrescription,
  useUpdatePrescription,
  useDeletePrescription,
  getListPrescriptionsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ScrollText, Upload, Camera, CheckCircle2, AlertTriangle, 
  Trash2, FileText, FileWarning, Eye, Pill, FileSignature 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { CameraCaptureDialog } from "@/components/CameraCaptureDialog";

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function PrescriptionsPage() {
  const { user } = useUser();
  const userId = user?.id || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<"list" | "upload">("list");
  
  // Data
  const { data: prescriptions, isLoading } = useListPrescriptions(
    { userId },
    { query: { enabled: !!userId, queryKey: getListPrescriptionsQueryKey({ userId }) } }
  );

  const createMutation = useCreatePrescription();
  const extractMutation = useExtractPrescription();
  const updateMutation = useUpdatePrescription();
  const deleteMutation = useDeletePrescription();

  // Extraction State
  const [extractedData, setExtractedData] = useState<any>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Handlers
  const processPrescriptionFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }

    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await extractMutation.mutateAsync({
        data: {
          userId,
          imageBase64: base64,
          mimeType,
          fileName: file.name,
          language: language.aiName,
        } as any
      });
      
      setExtractedData({
        ...res,
        fileName: file.name,
        mimeType
      });
      setReviewMode(true);
      
    } catch (err) {
      toast({ title: "Extraction failed", description: "Could not read the prescription.", variant: "destructive" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processPrescriptionFile(file);
    e.target.value = "";
  };

  const handleSaveReviewed = () => {
    if (!extractedData) return;
    
    createMutation.mutate({
      data: {
        userId,
        prescriberName: extractedData.prescriberName,
        prescriptionDate: extractedData.prescriptionDate,
        extractedText: extractedData.extractedText,
        summary: extractedData.summary,
        isHandwritten: extractedData.isHandwritten,
        overallConfidence: extractedData.overallConfidence,
        warnings: extractedData.warnings,
        fileName: extractedData.fileName,
        mimeType: extractedData.mimeType,
        status: "reviewed",
        medicationItems: extractedData.medicationItems || []
      }
    }, {
      onSuccess: () => {
        toast({ title: "Prescription saved successfully" });
        queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey({ userId }) });
        setReviewMode(false);
        setExtractedData(null);
        setActiveTab("list");
      }
    });
  };

  const handleStatusToggle = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "archived" : "active";
    updateMutation.mutate({
      id,
      data: { status: newStatus as any }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey({ userId }) });
        toast({ title: `Marked as ${newStatus}` });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this prescription?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey({ userId }) });
        toast({ title: "Deleted successfully" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground mt-1">Digitize and manage your medication prescriptions.</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <Button 
            variant={activeTab === "list" ? "default" : "ghost"} 
            className={activeTab === "list" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"}
            onClick={() => { setActiveTab("list"); setReviewMode(false); }}
          >
            <ScrollText className="mr-2 h-4 w-4" /> My Records
          </Button>
          <Button 
            variant={activeTab === "upload" ? "default" : "ghost"} 
            className={activeTab === "upload" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"}
            onClick={() => setActiveTab("upload")}
          >
            <Camera className="mr-2 h-4 w-4" /> Upload New
          </Button>
        </div>
      </div>

      {activeTab === "upload" && !reviewMode && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-4">
              {extractMutation.isPending ? <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div> : <Upload className="h-8 w-8" />}
            </div>
            <CardTitle className="text-xl mb-2">Upload a Prescription</CardTitle>
            <CardDescription className="max-w-md mx-auto mb-6 text-base">
              Take a photo or upload an image of a handwritten or printed prescription. Our AI will extract the medications and instructions.
            </CardDescription>
            <div className="flex gap-4">
              <Button
                type="button"
                data-testid="button-prescription-take-photo"
                className="h-auto bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700"
                onClick={() => setCameraOpen(true)}
                disabled={extractMutation.isPending}
              >
                <Camera className="h-5 w-5" />
                Take Photo
              </Button>
              <Label htmlFor="upload-file" className="cursor-pointer">
                <div className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors">
                  <Upload className="h-5 w-5" /> Choose File
                </div>
                <input type="file" accept="image/*" id="upload-file" className="hidden" onChange={handleFileUpload} disabled={extractMutation.isPending} />
              </Label>
            </div>
            <CameraCaptureDialog
              open={cameraOpen}
              onOpenChange={setCameraOpen}
              onCapture={processPrescriptionFile}
              title="Photograph Prescription"
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "upload" && reviewMode && extractedData && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <FileWarning className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-bold text-sm">Review Required</p>
              <p className="text-sm">Please verify the AI-extracted details below before saving. AI can make mistakes.</p>
            </div>
          </div>
          
          <Card className="border-teal-100 shadow-md overflow-hidden">
            <CardHeader className="bg-teal-50/50 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-teal-600" />
                  Extracted Details
                </CardTitle>
                <div className="flex items-center gap-3">
                  {extractedData.isHandwritten && <Badge variant="secondary" className="bg-slate-100 text-slate-700">Handwritten</Badge>}
                  <Badge variant="outline" className={extractedData.overallConfidence > 80 ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"}>
                    {extractedData.overallConfidence}% Confidence
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Doctor Name</Label>
                  <Input value={extractedData.prescriberName || ""} onChange={e => setExtractedData({...extractedData, prescriberName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</Label>
                  <Input value={extractedData.prescriptionDate || ""} onChange={e => setExtractedData({...extractedData, prescriptionDate: e.target.value})} />
                </div>
              </div>

              {extractedData.warnings?.length > 0 && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 text-sm">
                  <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> AI Warnings</p>
                  <ul className="list-disc pl-5">
                    {extractedData.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Medications Found ({extractedData.medicationItems?.length || 0})</Label>
                {extractedData.medicationItems?.length > 0 ? (
                  <div className="space-y-3">
                    {extractedData.medicationItems.map((med: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-xl bg-white shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center shrink-0">
                          <Pill className="h-5 w-5" />
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="col-span-2 sm:col-span-1 space-y-1">
                            <Label className="text-[10px] text-slate-500">Name & Strength</Label>
                            <Input value={med.medicationName} onChange={e => {
                              const newMeds = [...extractedData.medicationItems];
                              newMeds[idx].medicationName = e.target.value;
                              setExtractedData({...extractedData, medicationItems: newMeds});
                            }} className="h-8 text-sm font-semibold" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-500">Dosage</Label>
                            <Input value={med.dosage || ""} onChange={e => {
                              const newMeds = [...extractedData.medicationItems];
                              newMeds[idx].dosage = e.target.value;
                              setExtractedData({...extractedData, medicationItems: newMeds});
                            }} className="h-8 text-sm" placeholder="e.g. 1 pill" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-500">Frequency</Label>
                            <Input value={med.frequency || ""} onChange={e => {
                              const newMeds = [...extractedData.medicationItems];
                              newMeds[idx].frequency = e.target.value;
                              setExtractedData({...extractedData, medicationItems: newMeds});
                            }} className="h-8 text-sm" placeholder="e.g. Twice a day" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-500">Duration</Label>
                            <Input value={med.duration || ""} onChange={e => {
                              const newMeds = [...extractedData.medicationItems];
                              newMeds[idx].duration = e.target.value;
                              setExtractedData({...extractedData, medicationItems: newMeds});
                            }} className="h-8 text-sm" placeholder="e.g. 5 days" />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] text-slate-500">Instructions</Label>
                            <Input value={med.instructions || ""} onChange={e => {
                              const newMeds = [...extractedData.medicationItems];
                              newMeds[idx].instructions = e.target.value;
                              setExtractedData({...extractedData, medicationItems: newMeds});
                            }} className="h-8 text-sm" placeholder="e.g. After meals" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-4 italic">No specific medications were cleanly extracted.</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary / Notes</Label>
                <Textarea value={extractedData.summary || ""} onChange={e => setExtractedData({...extractedData, summary: e.target.value})} className="min-h-[80px]" />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-4 flex justify-end gap-3 border-t">
              <Button variant="ghost" onClick={() => { setReviewMode(false); setExtractedData(null); }}>Cancel</Button>
              <Button onClick={handleSaveReviewed} disabled={createMutation.isPending} className="font-bold">
                {createMutation.isPending ? "Saving..." : "Confirm & Save"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {activeTab === "list" && (
        <>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : prescriptions && prescriptions.length > 0 ? (
            <div className="grid gap-4">
              {prescriptions.map(rx => (
                <Card key={rx.id} className={`overflow-hidden transition-all ${rx.status === 'archived' ? 'opacity-70 bg-slate-50' : 'hover:shadow-md'}`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-5 flex-1 flex gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${rx.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'}`}>
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-slate-900">{rx.prescriberName || "Unknown Doctor"}</h3>
                            <Badge variant={rx.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                              {rx.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mb-2">
                            {new Date(rx.createdAt).toLocaleDateString()} • {rx.medicationItems?.length || 0} medications
                          </p>
                          <p className="text-sm text-slate-700 line-clamp-2">
                            {rx.summary}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 md:w-48 border-t md:border-t-0 md:border-l flex md:flex-col justify-end md:justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => handleStatusToggle(rx.id, rx.status)}
                        >
                          {rx.status === 'active' ? 'Archive' : 'Mark Active'}
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(rx.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <ScrollText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Prescriptions Yet</h3>
              <p className="text-slate-500 mb-4 max-w-sm mx-auto">Keep all your prescriptions in one secure place. Upload your first one to get started.</p>
              <Button onClick={() => setActiveTab("upload")}>
                <Camera className="h-4 w-4 mr-2" />
                Upload Prescription
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}