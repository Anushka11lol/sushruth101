import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { Link, useParams, useLocation } from "wouter";
import { useGetPreConsultation, useReviewPreConsultation, getGetPreConsultationQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, FileText, Check, ShieldAlert, X, ChevronLeft, Stethoscope, Loader2
} from "lucide-react";

export default function DoctorReviewPage() {
  const { user } = useUser();
  const userId = user?.id || "";
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consultation, isLoading } = useGetPreConsultation(
    id,
    { callerUserId: userId },
    { query: { enabled: !!id && !!userId, queryKey: getGetPreConsultationQueryKey(id, { callerUserId: userId }) } }
  );

  const reviewMutation = useReviewPreConsultation();

  const [doctorNote, setDoctorNote] = useState("");
  const [verificationStates, setVerificationStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (consultation) {
      setDoctorNote(consultation.doctorNotes || "");
      setVerificationStates(consultation.verificationStates as Record<string, boolean> || {});
    }
  }, [consultation]);

  const toggleVerified = (section: string) => {
    setVerificationStates(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleReview = (status: "reviewed" | "incomplete") => {
    reviewMutation.mutate({
      id,
      data: {
        callerUserId: userId,
        status,
        doctorNotes: doctorNote,
        verificationStates
      }
    }, {
      onSuccess: () => {
        toast({ title: `Consultation marked as ${status}` });
        queryClient.invalidateQueries({ queryKey: getGetPreConsultationQueryKey(id, { callerUserId: userId }) });
        setLocation("/doctor");
      }
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );

  if (!consultation) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center mt-12 space-y-6">
        <Stethoscope className="h-16 w-16 text-slate-300 mx-auto" />
        <h2 className="text-2xl font-bold">Consultation Not Found</h2>
        <p className="text-slate-500">The requested intake record could not be found.</p>
        <Link href="/doctor"><Button>Return to Dashboard</Button></Link>
      </div>
    );
  }

  const intake = consultation.intakeData as any;
  const isReadOnly = consultation.status === "reviewed";

  const Section = ({ id: sectionId, title, children }: { id: string, title: string, children: React.ReactNode }) => {
    const isVerified = verificationStates[sectionId];
    return (
      <Card className={`border shadow-sm mb-6 overflow-hidden transition-colors ${isVerified ? 'border-green-300 ring-1 ring-green-100' : 'border-slate-200'}`}>
        <CardHeader className={`py-4 px-6 flex flex-row items-center justify-between ${isVerified ? 'bg-green-50/50' : 'bg-slate-50/50'}`}>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {title}
            {isVerified && <CheckCircle className="h-4 w-4 text-green-600" />}
          </CardTitle>
          <Button 
            variant={isVerified ? "default" : "outline"} 
            size="sm" 
            onClick={() => toggleVerified(sectionId)}
            className={isVerified ? "bg-green-600 hover:bg-green-700" : ""}
            disabled={isReadOnly || reviewMutation.isPending}
          >
            {isVerified ? <><Check className="mr-2 h-4 w-4" /> Verified</> : "Mark Verified"}
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {children}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 mt-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/doctor">
          <Button variant="ghost" size="icon" className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Intake Review</h1>
          <div className="text-slate-500 font-medium mt-1 flex items-center gap-2">
            <span>Patient: <strong className="text-slate-700">{consultation.patientName}</strong></span>
            <span className="mx-2">•</span>
            <span>Status:</span>
            <Badge variant={
              consultation.status === 'reviewed' ? 'default' :
              consultation.status === 'incomplete' ? 'destructive' : 'secondary'
            }>
              {consultation.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {intake.summary?.aiStructured?.redFlags?.length > 0 && (
        <Alert className="mb-8 border-red-500 bg-red-50 shadow-md">
          <ShieldAlert className="h-6 w-6 text-red-600" />
          <AlertTitle className="text-red-800 font-bold text-lg">URGENT: Red Flags Present</AlertTitle>
          <AlertDescription className="text-red-700 mt-2 font-medium">
            <ul className="list-disc pl-5 space-y-1">
              {intake.summary.aiStructured.redFlags.map((rf: string, i: number) => <li key={i}>{rf}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          <Section id="chiefComplaint" title="Chief Complaint & HPI">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Main Problem</p>
                <p className="text-lg font-medium text-slate-900 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  {intake.summary?.patientReported?.chiefComplaint || "No complaint recorded"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Onset</p>
                  <p className="font-semibold text-slate-800">{intake.summary?.patientReported?.onset || "N/A"}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Severity</p>
                  <p className="font-semibold text-slate-800">{intake.summary?.patientReported?.severity || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-2">History of Present Illness</p>
                <div className="space-y-3">
                  {Object.entries(intake.summary?.patientReported?.hpi || {}).map(([q, a]) => (
                    <div key={q} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">{q}</p>
                      <p className="text-sm font-medium text-slate-900">{String(a) || "N/A"}</p>
                    </div>
                  ))}
                  {Object.keys(intake.summary?.patientReported?.hpi || {}).length === 0 && (
                    <p className="text-sm text-slate-500 italic">No HPI questions answered.</p>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section id="medicalHistory" title="Medical History">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Conditions</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.medicalHistory?.conditions || "None reported"}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Medications</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.medicalHistory?.medications || "None reported"}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Allergies</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.medicalHistory?.allergies || "None reported"}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Lifestyle</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.medicalHistory?.lifestyle || "None reported"}</p>
              </div>
            </div>
          </Section>

          <Section id="ayush" title="AYUSH & Habits">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Prakriti</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.ayush?.prakriti || "N/A"}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Stamina</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.ayush?.vyayamashakti || "N/A"}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Mind</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.ayush?.sattva || "N/A"}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Diet</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.ayush?.appetite || "N/A"}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Sleep</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.ayush?.sleep || "N/A"}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Triggers</p>
                <p className="font-medium text-slate-800">{intake.summary?.aiStructured?.ayush?.triggers || "N/A"}</p>
              </div>
            </div>
          </Section>

          <Section id="documents" title={`Documents (${intake.summary?.aiStructured?.documentsFacts?.length || 0})`}>
            <div className="space-y-4">
              {intake.summary?.aiStructured?.documentsFacts?.map((doc: any, i: number) => (
                <div key={i} className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                  <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{doc.name}</p>
                    {doc.facts?.length > 0 ? (
                      <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded p-3 border border-slate-100">
                        <p className="font-semibold text-xs text-slate-500 uppercase mb-2">Extracted Facts</p>
                        <ul className="space-y-1">
                          {doc.facts.map((f: string, j: number) => <li key={j} className="flex items-start gap-2"><span className="text-slate-400 mt-1">•</span>{f}</li>)}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 mt-1">No automated facts extracted. Manual review required.</p>
                    )}
                  </div>
                </div>
              ))}
              {(!intake.summary?.aiStructured?.documentsFacts || intake.summary?.aiStructured?.documentsFacts.length === 0) && (
                <p className="text-slate-500 italic p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">No documents provided by the patient.</p>
              )}
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm sticky top-24">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Clinician Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Textarea
                placeholder="Type internal notes here..."
                className="min-h-[200px] resize-none border-slate-300 focus-visible:ring-indigo-400"
                value={doctorNote}
                onChange={(e) => setDoctorNote(e.target.value)}
                disabled={isReadOnly || reviewMutation.isPending}
              />

              {!isReadOnly && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <Button
                    className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => handleReview("reviewed")}
                    disabled={reviewMutation.isPending}
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    {reviewMutation.isPending ? "Saving..." : "Confirm Consultation"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-base font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
                    onClick={() => handleReview("incomplete")}
                    disabled={reviewMutation.isPending}
                  >
                    <X className="mr-2 h-5 w-5" /> Send Back to Patient
                  </Button>
                </div>
              )}

              {isReadOnly && (
                <div className="pt-4 border-t border-slate-100 text-center">
                  <p className="text-sm font-semibold text-green-700 flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Reviewed Successfully
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}