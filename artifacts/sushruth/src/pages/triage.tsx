import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { useScreenReader } from "@/context/ScreenReaderContext";
import { useLanguage, useTranslation } from "@/context/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateTriageSession,
  useListTriageSessions,
  useListDoctors,
  useCreateAppointment,
  useDeleteTriageSession,
  useGetUserProfile,
  getListTriageSessionsQueryKey,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Mic,
  MicOff,
  Send,
  AlertTriangle,
  Stethoscope,
  Home,
  Building2,
  Siren,
  Star,
  IndianRupee,
  Calendar,
  ExternalLink,
  Navigation,
  Languages,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  History,
  X,
  Hospital,
  Locate,
  Search,
  MapPinned,
  MapPin,
} from "lucide-react";
import { INDIAN_LANGUAGES } from "@/context/LanguageContext";

function openGoogleMaps(hospital: string, city: string) {
  const query = encodeURIComponent(`${hospital} ${city} India`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
}

function openNearbySpecialist(specialist: string) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const q = encodeURIComponent(`${specialist} near me India`);
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${q}&center=${latitude},${longitude}`,
          "_blank",
          "noopener,noreferrer",
        );
      },
      () => {
        const q = encodeURIComponent(`${specialist} India`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank", "noopener,noreferrer");
      },
    );
  }
}

function openMapsQuery(query: string, coords?: { lat: number; lng: number }) {
  const q = encodeURIComponent(query);
  const base = `https://www.google.com/maps/search/?api=1&query=${q}`;
  const url = coords ? `${base}&center=${coords.lat},${coords.lng}&zoom=13` : base;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function TriagePage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { isEnabled: srEnabled, speak } = useScreenReader();
  const { language: preferredLang } = useLanguage();
  const t = useTranslation();

  const [symptoms, setSymptoms] = useState("");
  const [selectedLangCode, setSelectedLangCode] = useState(preferredLang.code);
  const [isRecording, setIsRecording] = useState(false);
  const [sttUnsupported, setSttUnsupported] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [bookingDoc, setBookingDoc] = useState<any>(null);
  const [bookingSlot, setBookingSlot] = useState("");
  const [bookingReason, setBookingReason] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [viewingPastId, setViewingPastId] = useState<number | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [locating, setLocating] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [voicePreview, setVoicePreview] = useState("");
  const [voiceConfidence, setVoiceConfidence] = useState<number | null>(null);
  const [voiceNeedsReview, setVoiceNeedsReview] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);
  const voiceFinalTranscriptRef = useRef("");
  const voiceInterimTranscriptRef = useRef("");
  const voiceConfidenceSamplesRef = useRef<number[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedLangCode(preferredLang.code);
  }, [preferredLang.code]);

  const URGENCY_CONFIG: Record<
    string,
    { label: string; color: string; badgeClass: string; icon: React.ElementType; description: string }
  > = {
    low: {
      label: t.low_urgency,
      color: "border-green-400 bg-green-50",
      badgeClass: "bg-green-100 text-green-800 border-green-300",
      icon: Home,
      description: "Your symptoms appear mild. Home care may be sufficient.",
    },
    moderate: {
      label: t.moderate_urgency,
      color: "border-amber-400 bg-amber-50",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      icon: Stethoscope,
      description: "Please schedule a clinic visit soon.",
    },
    high: {
      label: t.high_urgency,
      color: "border-orange-500 bg-orange-50",
      badgeClass: "bg-orange-100 text-orange-800 border-orange-400",
      icon: Building2,
      description: "Seek medical attention promptly.",
    },
    emergency: {
      label: t.emergency_urgency,
      color: "border-red-600 bg-red-50",
      badgeClass: "bg-red-100 text-red-800 border-red-400",
      icon: Siren,
      description: "Go to the nearest emergency room or call 108 immediately.",
    },
  };

  const CARE_SUGGESTION_LABEL: Record<string, string> = {
    home_care: t.home_care,
    clinic_visit: t.clinic_visit,
    emergency_care: t.emergency_care,
  };

  useEffect(() => {
    if (!result || !srEnabled) return;
    const urgency = URGENCY_CONFIG[result.urgencyLevel] ?? URGENCY_CONFIG.low;
    const parts: string[] = [
      `Triage complete.`,
      `Urgency level: ${urgency.label}.`,
      urgency.description,
    ];
    if (result.aiSummary) parts.push(result.aiSummary);
    parts.push(`Recommended specialist: ${result.specialistRecommended}.`);
    const careLabel = CARE_SUGGESTION_LABEL[result.careSuggestion] ?? result.careSuggestion;
    parts.push(`Suggested care: ${careLabel}.`);
    if (result.disclaimer) parts.push(result.disclaimer);
    speak(parts.join(" "));
  }, [result, srEnabled]);

  const createTriage = useCreateTriageSession();
  const deleteTriage = useDeleteTriageSession();
  const { data: sessions, isLoading: sessionsLoading } = useListTriageSessions(
    { userId },
    { query: { enabled: !!userId } as any },
  );

  const { data: profile } = useGetUserProfile(userId, {
    query: { enabled: !!userId, retry: false } as any,
  });

  const userCity = profile?.city?.trim() || "";

  const { data: doctors, isLoading: doctorsLoading } = useListDoctors(
    {
      specialty: result?.specialistRecommended,
      ...(userCity ? { city: userCity } : {}),
    },
    { query: { enabled: !!result?.specialistRecommended } as any },
  );

  // Fallback: all cities for the same specialty (used when city-filtered list is empty)
  const noneInCity = !doctorsLoading && !!userCity && Array.isArray(doctors) && doctors.length === 0;
  const { data: fallbackDoctors, isLoading: fallbackLoading } = useListDoctors(
    { specialty: result?.specialistRecommended },
    { query: { enabled: noneInCity } as any },
  );

  const createAppointment = useCreateAppointment();

  const currentLang = INDIAN_LANGUAGES.find((l) => l.code === selectedLangCode) ?? INDIAN_LANGUAGES[0];

  const appendText = (base: string, addition: string) => [base.trim(), addition.trim()].filter(Boolean).join(" ").trim();

  const stopVoiceRecognition = () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const startVoiceRecognition = () => {
    const hasSpeechRecognition = ("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window);
    if (!hasSpeechRecognition) {
      setSttUnsupported(true);
      return;
    }
    setSttUnsupported(false);
    setVoiceMessage(null);
    setVoicePreview("");
    setVoiceConfidence(null);
    setVoiceNeedsReview(false);
    voiceFinalTranscriptRef.current = "";
    voiceInterimTranscriptRef.current = "";
    voiceConfidenceSamplesRef.current = [];

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = currentLang.sttCode;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
        const speechResult = event.results[i];
        const bestAlternative = speechResult[0];
        if (!bestAlternative) continue;
        if (speechResult.isFinal) {
          voiceFinalTranscriptRef.current = appendText(
            voiceFinalTranscriptRef.current,
            bestAlternative.transcript,
          );
          if (typeof bestAlternative.confidence === "number" && bestAlternative.confidence > 0) {
            voiceConfidenceSamplesRef.current.push(bestAlternative.confidence);
          }
        } else {
          interimTranscript = appendText(interimTranscript, bestAlternative.transcript);
        }
      }
      voiceInterimTranscriptRef.current = interimTranscript;
      const transcript = appendText(voiceFinalTranscriptRef.current, interimTranscript);
      if (transcript) {
        const samples = voiceConfidenceSamplesRef.current;
        const confidence = samples.length > 0
          ? samples.reduce((total, sample) => total + sample, 0) / samples.length
          : null;
        setVoicePreview(transcript);
        setVoiceConfidence(confidence);
        setVoiceNeedsReview(confidence === null || confidence < 0.55);
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error === "aborted" && !shouldKeepListeningRef.current) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceMessage("Microphone access is unavailable. Please allow microphone access or type your symptoms instead.");
      } else if (event.error === "no-speech") {
        setVoiceMessage("I did not hear enough speech. Please try again, speak naturally, or type your symptoms instead.");
      } else {
        setVoiceMessage("Voice recognition had trouble this time. Please repeat your answer or use the text box instead.");
      }
      shouldKeepListeningRef.current = false;
      setIsRecording(false);
    };
    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        window.setTimeout(() => {
          if (!shouldKeepListeningRef.current) return;
          try {
            recognition.start();
          } catch {
            // Browsers can throw if a restart overlaps with their internal stop.
          }
        }, 150);
        return;
      }
      setIsRecording(false);
      if (!voiceFinalTranscriptRef.current.trim() && !voiceInterimTranscriptRef.current.trim()) {
        setVoiceMessage("I did not catch an answer. Please try again or choose the text option.");
      }
    };
    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      shouldKeepListeningRef.current = false;
      setIsRecording(false);
      setVoiceMessage("Voice input could not start. Please try again or type your symptoms instead.");
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  };

  const handleLanguageChange = (languageCode: string) => {
    if (isRecording) stopVoiceRecognition();
    setSelectedLangCode(languageCode);
    setVoiceMessage(null);
  };

  const handleUseVoiceText = () => {
    if (!voicePreview.trim()) return;
    setSymptoms((prev) => appendText(prev, voicePreview));
    setInputError(null);
    setVoicePreview("");
    setVoiceConfidence(null);
    setVoiceNeedsReview(false);
    setVoiceMessage(null);
  };

  const handleRetryVoice = () => {
    if (isRecording) stopVoiceRecognition();
    startVoiceRecognition();
  };

  const handleTypeInstead = () => {
    if (isRecording) stopVoiceRecognition();
    setVoicePreview("");
    setVoiceConfidence(null);
    setVoiceNeedsReview(false);
    setVoiceMessage(null);
    window.setTimeout(() => document.getElementById("symptoms-input")?.focus(), 0);
  };

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const handleViewSession = (session: any) => {
    setResult(session);
    setViewingPastId(session.id);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    setTimeout(() => resultRef.current?.focus(), 150);
    if (srEnabled) speak(`Viewing past triage session from ${new Date(session.createdAt).toLocaleDateString("en-IN")}. Urgency: ${URGENCY_CONFIG[session.urgencyLevel]?.label ?? session.urgencyLevel}.`);
  };

  const handleClearPastView = () => {
    setResult(null);
    setViewingPastId(null);
  };

  const handleSubmit = async () => {
    if (!symptoms.trim() || !userId) return;
    setResult(null);
    setViewingPastId(null);
    setInputError(null);
    try {
      const data = await createTriage.mutateAsync({
        data: { userId, symptoms: symptoms.trim(), language: selectedLangCode },
      });
      setResult(data);
      queryClient.invalidateQueries({ queryKey: getListTriageSessionsQueryKey({ userId }) });
      setTimeout(() => resultRef.current?.focus(), 100);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      const body = err?.response?.data ?? err?.data ?? err?.body;
      if (status === 422 && body?.error === "NOT_MEDICAL_INPUT") {
        setInputError(
          "The input doesn't seem like a medical problem. Please check your symptoms and input again.",
        );
      }
    }
  };

  const handleDeleteSession = async () => {
    if (deleteConfirmId === null) return;
    try {
      await deleteTriage.mutateAsync({ id: deleteConfirmId });
      queryClient.invalidateQueries({ queryKey: getListTriageSessionsQueryKey({ userId }) });
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleBookAppointment = async () => {
    if (!bookingDoc || !bookingSlot || !userId) return;
    await createAppointment.mutateAsync({
      data: {
        userId,
        doctorId: bookingDoc.id,
        scheduledAt: bookingSlot,
        reason: bookingReason || symptoms,
        linkedTriageId: result?.id,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ userId }) });
    setBookingDoc(null);
    setBookingSlot("");
    setBookingReason("");
    alert("Appointment booked successfully!");
  };

  const urgencyConfig = result ? URGENCY_CONFIG[result.urgencyLevel] ?? URGENCY_CONFIG.low : null;
  const UrgencyIcon = urgencyConfig?.icon;

  const liveAnnouncement = result
    ? `Triage complete. ${urgencyConfig?.label ?? result.urgencyLevel}. ${urgencyConfig?.description ?? ""} Recommended specialist: ${result.specialistRecommended}.`
    : createTriage.isPending
    ? "Analyzing your symptoms, please wait."
    : "";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.ai_symptom_triage}</h1>
        <p className="text-muted-foreground mt-1">{t.describe_symptoms_desc}</p>
      </div>

      <div aria-live="assertive" aria-atomic="true" className="sr-only" role="status">
        {liveAnnouncement}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.describe_symptoms_title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="language-select" className="text-sm text-muted-foreground mb-1 block">
              {t.language_label}
            </Label>
            <Select value={selectedLangCode} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language-select" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {INDIAN_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="font-medium">{l.nativeName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{l.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Label htmlFor="symptoms-input" className="sr-only">
              {t.describe_symptoms_title}
            </Label>
            <Textarea
              id="symptoms-input"
              placeholder={
                currentLang.code === "en"
                  ? "E.g. I have had a headache for 3 days, mild fever, and sore throat…"
                  : currentLang.code === "mni"
                    ? "ꯅꯍꯥꯛꯀꯤ ꯑꯅꯥꯕꯒꯤ ꯈꯨꯗꯝꯁꯤꯡ ꯃꯤꯇꯩ ꯂꯣꯟꯗ ꯏꯕꯤꯌꯨ…"
                  : `Describe your symptoms in ${currentLang.name} (${currentLang.nativeName})…`
              }
              value={symptoms}
              onChange={(e) => { setSymptoms(e.target.value); setInputError(null); }}
              className="min-h-[120px] pr-12 resize-none"
              aria-describedby="symptoms-hint"
            />
            <p id="symptoms-hint" className="sr-only">
              {currentLang.code === "mni"
                ? "ꯅꯍꯥꯛꯀꯤ ꯑꯅꯥꯕꯁꯤꯡ ꯏꯕꯤꯌꯨ ꯅꯠꯇ꯭ꯔꯒ ꯃꯥꯏꯀ꯭ꯔꯣꯐꯣꯟ ꯕꯇꯟ ꯁꯤꯖꯤꯟꯅꯗꯨꯅ ꯉꯥꯡꯕꯤꯌꯨ꯫ ꯂꯨꯟꯅ ꯅꯠꯇ꯭ꯔꯒ ꯊꯨꯅ ꯉꯥꯡꯕ ꯌꯥꯏ꯫ ꯍꯥꯄꯆꯤꯟꯗ꯭ꯔꯤꯉꯩꯗ ꯅꯍꯥꯛꯅ ꯌꯦꯡꯁꯤꯟꯕ ꯌꯥꯅ ꯏꯕ ꯑꯣꯏꯅ ꯎꯠꯀꯅꯤ꯫"
                : <>Type your symptoms or use the microphone button to speak in {currentLang.name}. You can speak slowly,
                  quickly, with pauses, or mix languages naturally. Your transcription will be shown for review before it
                  is added.</>}
            </p>
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "secondary"}
              className="absolute bottom-3 right-3 h-8 w-8"
              onClick={handleToggleRecording}
              aria-label={currentLang.code === "mni"
                ? (isRecording ? "ꯈꯣꯟꯖꯦꯜ ꯔꯦꯀꯣꯔꯗ ꯇꯧꯕ ꯂꯦꯞꯄꯤꯌꯨ" : "ꯃꯤꯇꯩ ꯂꯣꯟꯗ ꯈꯣꯟꯖꯦꯜ ꯍꯥꯄꯆꯤꯟꯕ ꯍꯧꯕꯤꯌꯨ")
                : (isRecording ? "Stop voice recording" : `Start voice input in ${currentLang.name}`)}
              aria-pressed={isRecording}
            >
              {isRecording ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
          {isRecording && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="status" aria-live="polite">
              <p className="font-medium animate-pulse">
                {currentLang.code === "mni"
                  ? "ꯃꯤꯇꯩ ꯂꯣꯟꯗ ꯇꯥꯔꯤ…"
                  : <>Listening in {currentLang.name} ({currentLang.nativeName})…</>}
              </p>
              <p className="mt-1 text-red-700/80">
                {currentLang.code === "mni"
                  ? "ꯃꯍꯧꯁꯥꯅ ꯉꯥꯡꯕꯤꯌꯨ꯫ ꯂꯦꯞꯄ, ꯑꯇꯣꯞꯄ ꯈꯣꯟꯊꯣꯛ ꯑꯃꯁꯨꯡ English ꯃꯦꯗꯤꯀꯦꯜ ꯋꯥꯍꯩꯁꯤꯡ ꯁꯤꯖꯤꯟꯅꯕ ꯌꯥꯏ꯫ ꯌꯦꯡꯁꯤꯟꯕ ꯁꯦꯝ ꯁꯥꯔꯕ ꯃꯇꯝꯗ ꯃꯥꯏꯀ꯭ꯔꯣꯐꯣꯟ ꯑꯃꯨꯛ ꯇꯦꯛ ꯇꯧꯕꯤꯌꯨ꯫"
                  : <>Speak naturally. Pauses, different accents, and English medical words are okay. Tap the microphone
                    again when you are ready to review.</>}
              </p>
            </div>
          )}
          {sttUnsupported && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">
              <p className="font-medium">Voice input is not supported in this browser.</p>
              <p className="mt-1">Please use Chrome or Edge, or type your symptoms instead.</p>
            </div>
          )}
          {voiceMessage && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert" aria-live="polite">
              {voiceMessage}
            </div>
          )}
          {voicePreview && !isRecording && (
            <div className={`rounded-xl border p-4 ${voiceNeedsReview ? "border-amber-300 bg-amber-50/70" : "border-primary/25 bg-primary/5"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Review what we heard</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Edit the words below if needed. Nothing is added to your symptoms until you choose “Use this text”.
                  </p>
                </div>
                <Mic className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </div>
              <Textarea
                value={voicePreview}
                onChange={(event) => {
                  setVoicePreview(event.target.value);
                  setVoiceNeedsReview(true);
                }}
                className="mt-3 min-h-[88px] resize-none bg-background"
                aria-label="Review and edit voice transcription"
              />
              <p className={`mt-2 text-xs ${voiceNeedsReview ? "text-amber-700" : "text-primary"}`}>
                {voiceNeedsReview
                  ? "Please check this carefully. If it does not match what you said, repeat it or type it yourself."
                  : "Please check this transcription before using it."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={handleUseVoiceText} disabled={!voicePreview.trim()}>
                  Use this text
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleRetryVoice}>
                  <Mic className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Repeat
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleTypeInstead}>
                  Type instead
                </Button>
              </div>
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!symptoms.trim() || createTriage.isPending}
            className="w-full"
            aria-busy={createTriage.isPending}
          >
            {createTriage.isPending ? (
              <span aria-live="polite">{t.analyzing_symptoms}</span>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                {t.analyze_symptoms}
              </>
            )}
          </Button>

          {inputError && (
            <Alert className="border-destructive/50 bg-destructive/10" role="alert" aria-live="assertive">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              <AlertDescription className="text-sm text-destructive font-medium">
                {inputError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && urgencyConfig && UrgencyIcon && (
        <div
          ref={resultRef}
          tabIndex={-1}
          className={`rounded-xl border-2 p-5 ${urgencyConfig.color} focus:outline-none`}
          role="region"
          aria-label={`Triage result: ${urgencyConfig.label}`}
        >
          {viewingPastId !== null && (
            <div className="flex items-center justify-between gap-2 mb-3 rounded-lg bg-background/70 border border-border px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <History className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>
                  Viewing past session from{" "}
                  <span className="font-medium text-foreground">
                    {new Date(result.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleClearPastView}
                aria-label="Clear past session view"
              >
                <X className="h-3 w-3 mr-1" aria-hidden="true" />
                Clear
              </Button>
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <UrgencyIcon className="h-6 w-6" aria-hidden="true" />
            <Badge variant="outline" className={`text-sm font-semibold px-3 py-1 ${urgencyConfig.badgeClass}`}>
              {urgencyConfig.label}
            </Badge>
            <Badge variant="secondary" className="ml-auto">
              {CARE_SUGGESTION_LABEL[result.careSuggestion] ?? result.careSuggestion}
            </Badge>
          </div>
          <p className="text-sm font-medium text-foreground mb-2">{urgencyConfig.description}</p>
          {result.aiSummary && (
            <p className="text-sm text-foreground/80 mb-3 leading-relaxed">{result.aiSummary}</p>
          )}
          <div className="rounded-lg bg-background/60 p-3 mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t.recommended_specialist}</p>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-foreground">{result.specialistRecommended}</p>
              <button
                onClick={() => openNearbySpecialist(result.specialistRecommended)}
                className="text-xs text-primary underline flex items-center gap-1 hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                aria-label={`Find ${result.specialistRecommended} near you on Google Maps`}
              >
                <Navigation className="h-3 w-3" aria-hidden="true" />
                {t.find_nearby}
              </button>
            </div>
          </div>
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <AlertDescription className="text-xs text-amber-800">
              {result.disclaimer}
            </AlertDescription>
          </Alert>

        </div>
      )}

      {result && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-primary" aria-hidden="true" />
              Find Real Clinics &amp; Hospitals
              <span className="text-xs font-normal text-muted-foreground ml-1">Live results via Google Maps</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Search for real verified clinics, hospitals, and specialist practices near{" "}
              {userCity ? <strong>{userCity}</strong> : "your location"}.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* City-based searches */}
              {userCity && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 text-xs h-9"
                    onClick={() => openMapsQuery(`${result.specialistRecommended} clinic ${userCity} India`)}
                    aria-label={`Find ${result.specialistRecommended} clinics in ${userCity}`}
                  >
                    <Search className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    {result.specialistRecommended} clinics in {userCity}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 text-xs h-9"
                    onClick={() => openMapsQuery(`hospital ${userCity} India`)}
                    aria-label={`Find hospitals in ${userCity}`}
                  >
                    <Hospital className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    Hospitals in {userCity}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 text-xs h-9"
                    onClick={() => openMapsQuery(`government hospital AIIMS ${userCity} India`)}
                    aria-label={`Find government hospitals in ${userCity}`}
                  >
                    <Hospital className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                    Govt / AIIMS hospitals in {userCity}
                  </Button>
                </>
              )}

              {/* GPS-based live search */}
              <Button
                variant="default"
                size="sm"
                className="justify-start gap-2 text-xs h-9 bg-primary text-primary-foreground"
                disabled={locating}
                aria-busy={locating}
                onClick={() => {
                  if (!navigator.geolocation) {
                    openMapsQuery(`${result.specialistRecommended} clinic hospital India`);
                    return;
                  }
                  setLocating(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setLocating(false);
                      openMapsQuery(
                        `${result.specialistRecommended} clinic hospital near me`,
                        { lat: pos.coords.latitude, lng: pos.coords.longitude },
                      );
                    },
                    () => {
                      setLocating(false);
                      openMapsQuery(
                        userCity
                          ? `${result.specialistRecommended} clinic ${userCity} India`
                          : `${result.specialistRecommended} clinic India`,
                      );
                    },
                    { timeout: 6000 },
                  );
                }}
                aria-label="Find clinics near my current GPS location"
              >
                <Locate className={`h-3.5 w-3.5 shrink-0 ${locating ? "animate-spin" : ""}`} aria-hidden="true" />
                {locating ? "Getting your location…" : "Find clinics near me (GPS)"}
              </Button>

              {!userCity && (
                <Link
                  href="/settings"
                  className="flex items-center gap-2 text-xs rounded-md border border-border bg-background px-3 py-2 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Set your city in account settings"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  Set your city for city-based searches
                </Link>
              )}
              <Link
                href="/appointments"
                className="flex items-center justify-center gap-2 rounded-md border border-primary bg-background px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                Go to Book Appointment
              </Link>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Opens Google Maps in a new tab — results are live from Google's database of verified businesses.
            </p>
          </CardContent>
        </Card>
      )}

      {sessions && sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" aria-hidden="true" />
                {t.past_triage_sessions}
                <span className="text-xs font-normal text-muted-foreground">({sessions.length})</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-2" role="status" aria-label="Loading past sessions">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <>
                <div className="space-y-2" role="list" aria-label="Past triage sessions">
                  {(showAllSessions ? sessions : sessions.slice(0, 5)).map((s) => {
                    const isActive = viewingPastId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                          isActive
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                        role="listitem"
                      >
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${URGENCY_CONFIG[s.urgencyLevel]?.badgeClass ?? ""}`}
                        >
                          {URGENCY_CONFIG[s.urgencyLevel]?.label ?? s.urgencyLevel}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{s.symptoms}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.specialistRecommended} &middot;{" "}
                            {new Date(s.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            size="sm"
                            className={`h-7 px-2 text-xs gap-1 ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={() => isActive ? handleClearPastView() : handleViewSession(s)}
                            aria-label={isActive ? "Close this session" : `View full results for: ${s.symptoms.slice(0, 40)}`}
                            aria-pressed={isActive}
                          >
                            {isActive ? (
                              <>
                                <X className="h-3 w-3" aria-hidden="true" />
                                Close
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" aria-hidden="true" />
                                View
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmId(s.id)}
                            aria-label={`${t.delete_session}: ${s.symptoms.slice(0, 30)}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sessions.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => setShowAllSessions((v) => !v)}
                    aria-expanded={showAllSessions}
                  >
                    {showAllSessions ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        Show {sessions.length - 5} more session{sessions.length - 5 !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent aria-labelledby="delete-triage-title">
          <DialogHeader>
            <DialogTitle id="delete-triage-title" className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              {t.delete_session}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.delete_session_confirm}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSession}
              disabled={deleteTriage.isPending}
            >
              {deleteTriage.isPending ? t.deleting : t.delete_btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bookingDoc} onOpenChange={(open) => !open && setBookingDoc(null)}>
        <DialogContent aria-labelledby="book-appt-triage-title">
          <DialogHeader>
            <DialogTitle id="book-appt-triage-title">Book Appointment</DialogTitle>
          </DialogHeader>
          {bookingDoc && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-semibold">{bookingDoc.name}</p>
                <p className="text-sm text-muted-foreground">{bookingDoc.specialty} &middot; {bookingDoc.hospital}, {bookingDoc.city}</p>
                <button
                  onClick={() => openGoogleMaps(bookingDoc.hospital, bookingDoc.city)}
                  className="text-xs text-primary underline flex items-center gap-1 mt-1 hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label={`View ${bookingDoc.hospital} on Google Maps`}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  View on Google Maps
                </button>
              </div>
              {bookingDoc.availableSlots && bookingDoc.availableSlots.length > 0 ? (
                <div>
                  <Label htmlFor="triage-slot">Select Available Slot</Label>
                  <Select value={bookingSlot} onValueChange={setBookingSlot}>
                    <SelectTrigger id="triage-slot" className="mt-1">
                      <SelectValue placeholder="Choose a slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {bookingDoc.availableSlots.map((slot: string) => (
                        <SelectItem key={slot} value={slot}>
                          {new Date(slot).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="triage-datetime">Preferred Date & Time</Label>
                  <Input
                    id="triage-datetime"
                    type="datetime-local"
                    className="mt-1"
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="triage-reason">Reason for Visit</Label>
                <Textarea
                  id="triage-reason"
                  className="mt-1"
                  placeholder="Brief reason..."
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDoc(null)}>{t.cancel}</Button>
            <Button
              onClick={handleBookAppointment}
              disabled={!bookingSlot || createAppointment.isPending}
            >
              {createAppointment.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
