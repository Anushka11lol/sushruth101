import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useScreenReader } from "@/context/ScreenReaderContext";
import { usePreConsultationLocalization } from "@/hooks/usePreConsultationLocalization";
import { translatePreConsultation } from "@/lib/preConsultationTranslations";
import { classifyComplaint, derivePotentialRedFlags, getAdaptiveQuestions } from "@/lib/clinicalQuestionEngine";
import { useExtractReportImage, useCreatePreConsultation, useListPatientPreConsultations, getListPatientPreConsultationsQueryKey } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CameraCaptureDialog } from "@/components/CameraCaptureDialog";

import { 
  Mic, MicOff, Camera, Upload, ChevronRight, ChevronLeft, Check, 
  AlertTriangle, FileText, X, Shield, User, 
  Activity, ClipboardList, HeartPulse, Edit2, Stethoscope, Download, ImageDown, Search, Send, MapPin, ExternalLink
} from "lucide-react";

// --- Types ---
type IntakeData = {
  consent: { accepted: boolean; timestamp: string | null };
  startedAt: string;
  updatedAt: string;
  submittedAt?: string;
  stage: number;
  basic: { age: string; gender: string; weight: string; height: string };
  mainProblem: { complaint: string; onset: string; severity: string };
  medicalHistory: { conditions: string; medications: string; allergies: string; lifestyle: string };
  hpi: { category: string; answers: Record<string, string> };
  ayush: { 
    appetite: string; sleep: string; bowel: string; bladder: string; 
    triggers: string; progression: string; 
    prakriti: string; vikriti: string; sara: string; samhanana: string;
    pramana: string; satmya: string; sattva: string; aharaShakti: string;
    vaya: string; vyayamashakti: string; samprapti: string;
  };
  documents: Array<{
    id: string;
    name: string;
    type: string;
    date: string;
    dataUrl?: string;
    extractedText?: string;
    facts: string[];
    needsVerification: boolean;
  }>;
  safety: Record<string, string>;
  redFlags: string[];
  status: 'Incomplete' | 'Urgent' | 'Ready for Consultation' | 'Reviewed';
  summary?: any;
};

type CaseSheetSource = "Patient-reported" | "AI-structured";

type CaseSheetRow = {
  label: string;
  value: string;
  source?: CaseSheetSource;
};

type CaseSheetSection = {
  number: number;
  title: string;
  rows: CaseSheetRow[];
  tone?: "default" | "alert" | "ayush";
};

const defaultIntake: IntakeData = {
  consent: { accepted: false, timestamp: null },
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stage: 1,
  basic: { age: "", gender: "", weight: "", height: "" },
  mainProblem: { complaint: "", onset: "", severity: "" },
  medicalHistory: { conditions: "", medications: "", allergies: "", lifestyle: "" },
  hpi: { category: "General", answers: {} },
  ayush: {
    appetite: "", sleep: "", bowel: "", bladder: "", triggers: "", progression: "",
    prakriti: "", vikriti: "", sara: "", samhanana: "", pramana: "", satmya: "",
    sattva: "", aharaShakti: "", vaya: "", vyayamashakti: "", samprapti: "",
  },
  documents: [],
  safety: {},
  redFlags: [],
  status: 'Incomplete'
};

function restoreIntakeDraft(saved: Partial<IntakeData>): IntakeData {
  return {
    ...defaultIntake,
    ...saved,
    consent: { ...defaultIntake.consent, ...saved.consent },
    basic: { ...defaultIntake.basic, ...saved.basic },
    mainProblem: { ...defaultIntake.mainProblem, ...saved.mainProblem },
    medicalHistory: { ...defaultIntake.medicalHistory, ...saved.medicalHistory },
    hpi: {
      ...defaultIntake.hpi,
      ...saved.hpi,
      answers: { ...defaultIntake.hpi.answers, ...saved.hpi?.answers },
    },
    ayush: { ...defaultIntake.ayush, ...saved.ayush },
    documents: Array.isArray(saved.documents) ? saved.documents : [],
    safety: { ...defaultIntake.safety, ...saved.safety },
    redFlags: Array.isArray(saved.redFlags) ? saved.redFlags : [],
  };
}

const PRECONSULT_TEXT: Record<string, {
  stages: string[];
  stageDescriptions: string[];
  summaryTitle: string;
  summaryDescription: string;
  patientDetails: string;
  clinicalDisclaimer: string;
  chooseDoctor: string;
  chooseDoctorDescription: string;
  selectDoctor: string;
  sendSummary: string;
  savePng: string;
  savePdf: string;
  openRecords: string;
  bookAppointment: string;
}> = {
  en: {
    stages: ["Basic Information", "Main Problem", "Medical History", "Detailed Symptoms", "Daily Habits & Constitution (AYUSH)", "Past Documents", "Safety Check", "Review & Confirm", "Doctor Summary"],
    stageDescriptions: ["Let's start with a few basic details about you.", "What brings you here today?", "Information about your past health helps doctors understand your full picture.", "Let's explore your symptoms in detail.", "Understanding your body's natural state and habits.", "Do you have any recent lab reports or prescriptions?", "Please answer honestly so we can check for emergencies.", "Review your answers before continuing.", "Choose where to send your summary."],
    summaryTitle: "Your Pre-Consultation Summary", summaryDescription: "Review, download, save, and choose where to send it. The clinic must process and approve the submission.",
    patientDetails: "Patient-reported details", clinicalDisclaimer: "This is not a diagnosis. A certified clinician must verify the information.",
    chooseDoctor: "Choose a doctor or clinic", chooseDoctorDescription: "Your summary is not sent until you select a destination and confirm.",
    selectDoctor: "Search/select a doctor", sendSummary: "Send Summary to Selected Doctor", savePng: "Save PNG", savePdf: "Save as PDF",
    openRecords: "Open Health Records", bookAppointment: "Go to Book Appointment",
  },
  ks: {
    stages: ["بنیادی معلومات", "اہم مسئلہ", "طبی تاریخ", "تفصیلی علامات", "روزمرہ عادات تہٕ جسمانی ساخت (آیوش)", "پرانہٕ دستاویزات", "حفاظتی جانچ", "جائزہ تہٕ تصدیق", "ڈاکٹر خلاصہ"],
    stageDescriptions: ["کینہہ بنیادی معلومات دِتھ شروعات کٔرو۔", "توہہ ییتہٕ کیا وجہہ آمت؟", "پرانہٕ صحت معلومات ڈاکٹرَس مکمل صورتحال سمجھنس منٛز مدد چھِ کران۔", "علامات تفصیل سان بیان کٔرو۔", "جسمچ قدرتی حالت تہٕ عادات سمجھو۔", "کیا توہہ حالیہ لیب رپورٹ یا نسخہ چھُ؟", "ہنگامی صورتحال جانچنہٕ خٲطرٕ ایمانداری سان جواب دِیو۔", "جاری کرنہٕ برونٛہہ جوابن ہُند جائزہ لیو۔", "خلاصہ کتھ ڈاکٹرَس سوزُن چھُ منتخب کٔرو۔"],
    summaryTitle: "تُہند مشورہٕ برونٛہہ خلاصہ", summaryDescription: "جائزہ لیو، ڈاؤن لوڈ تہٕ محفوظ کٔرو، تہٕ سوزنہٕ خٲطرٕ جگہ منتخب کٔرو۔ کلینک چھُ درخواست منظور کران۔",
    patientDetails: "مریض طرفہٕ دِنہٕ آمُت معلومات", clinicalDisclaimer: "یہ تشخیص نٔہ چھِ۔ تصدیق شدہ ڈاکٹرَس چھِ معلومات جانچُن۔",
    chooseDoctor: "ڈاکٹر یا کلینک منتخب کٔرو", chooseDoctorDescription: "منزل منتخب تہٕ تصدیق کرنہٕ تام خلاصہ نٔہ چھُ سوزنہٕ یوان۔",
    selectDoctor: "ڈاکٹر ژھانڈو/منتخب کٔرو", sendSummary: "منتخب ڈاکٹرَس خلاصہ سوزیو", savePng: "PNG محفوظ کٔرو", savePdf: "PDF محفوظ کٔرو",
    openRecords: "صحت ریکارڈ کھولو", bookAppointment: "ملاقات بک کٔرو",
  },
  brx: {
    stages: ["गुदि फोरमायथिहोग्रा", "गाहाय जेंना", "सावस्रिनि जारिमिन", "गुवारै लक्षण", "सानफ्रोमबोनि आदब आरो देहनि गुदि (AYUSH)", "सिगांनि फोरमानलाइ", "रैखाथि आनजाद", "नायफिन आरो थिक खालाम", "डक्टर सारांश"],
    stageDescriptions: ["नोंनि गुदि फोरमायथिजों जागाय।", "दिनै मा जेंनायै फैदों?", "सिगांनि सावस्रि फोरमायथिया डक्टरखौ बुजिनायाव मदद खालामो।", "लक्षणफोरखौ गुवारै फोरमाय।", "देहनि गुदि आरो आदबखौ बुजि।", "नोंहा गोदान रिपोर्ट एबा दवाइनि नुस्खा दं नामा?", "आपतकाल नायनो थारै फिन हो।", "सिगां दावगानायनि फिनफोर नायफिन।", "सारांशखौ बबेयाव दैथायनो सायख।"],
    summaryTitle: "नोंनि सिगां सोलोंनि सारांश", summaryDescription: "नायफिन, डाउनलोड, थिना हो आरो बबेयाव दैथायनो सायख। क्लिनिकआ अनुरोधखौ नायबिजिरगोन।",
    patientDetails: "रोगियै होनाय फोरमायथि", clinicalDisclaimer: "बेयो रोग सिनायथि नङा। प्रमाणित डक्टरै नायबिजिरनांगोन।",
    chooseDoctor: "डक्टर एबा क्लिनिक सायख", chooseDoctorDescription: "जायगा सायखनाय आरो थिक खालामनायनि सिगां सारांश दैथायनाय नङा।",
    selectDoctor: "डक्टर नागिर/सायख", sendSummary: "सायखनाय डक्टरनो सारांश दैथाय", savePng: "PNG थिना हो", savePdf: "PDF थिना हो",
    openRecords: "सावस्रि रेकर्ड खेव", bookAppointment: "अपोइन्टमेन्ट बुक खालाम",
  },
  sat: {
    stages: ["ᱢᱩᱞ ᱵᱤᱵᱨᱚᱱ", "ᱢᱩᱬ ᱢᱩᱫᱫᱟ", "ᱫᱟᱣᱟᱠᱟᱱ ᱦᱤᱛᱟᱹᱞ", "ᱵᱤᱥᱛᱟᱹᱨ ᱞᱟᱠᱷᱟᱱ", "ᱫᱤᱱᱟᱹᱢ ᱟᱪᱟᱨ ᱟᱨ ᱦᱚᱲᱢᱚ (AYUSH)", "ᱢᱟᱲᱟᱝ ᱫᱚᱞᱤᱞ", "ᱱᱤᱨᱟᱹᱯᱚᱛᱛᱟ ᱧᱮᱞ", "ᱧᱮᱞ ᱫᱚᱦᱚ ᱟᱨ ᱱᱤᱥᱴᱟᱹ", "ᱰᱟᱠᱛᱟᱨ ᱥᱟᱨᱟᱝᱥ"],
    stageDescriptions: ["ᱢᱩᱞ ᱵᱤᱵᱨᱚᱱ ᱠᱷᱚᱱ ᱮᱦᱚᱵ ᱢᱮ।", "ᱛᱮᱦᱮᱧ ᱪᱮᱫ ᱢᱩᱫᱫᱟ ᱜᱮᱭᱟ?", "ᱢᱟᱲᱟᱝ ᱥᱮᱬᱟ ᱵᱤᱵᱨᱚᱱ ᱰᱟᱠᱛᱟᱨ ᱵᱩᱡᱷᱟᱹᱣᱮᱭᱟ।", "ᱞᱟᱠᱷᱟᱱ ᱵᱤᱥᱛᱟᱹᱨ ᱛᱮ ᱢᱮᱱ ᱢᱮ।", "ᱦᱚᱲᱢᱚ ᱟᱨ ᱟᱪᱟᱨ ᱵᱩᱡᱷᱟᱹᱣ ᱢᱮ।", "ᱱᱟᱣᱟ ᱞᱮᱵ ᱨᱤᱯᱳᱨᱴ ᱵᱟᱝᱠᱷᱟᱱ ᱫᱟᱣᱟᱭ ᱪᱤᱴᱷᱤ ᱢᱮᱱᱟᱜᱼᱟ?", "ᱵᱤᱯᱚᱫ ᱧᱮᱞ ᱞᱟᱹᱜᱤᱫ ᱥᱟᱹᱨᱤ ᱛᱮ ᱨᱚᱲ ᱢᱮ।", "ᱞᱟᱦᱟ ᱥᱮᱱᱚᱜ ᱢᱟᱲᱟᱝ ᱨᱚᱲ ᱧᱮᱞ ᱢᱮ।", "ᱥᱟᱨᱟᱝᱥ ᱚᱠᱟ ᱰᱟᱠᱛᱟᱨ ᱛᱷᱮᱱ ᱠᱩᱞ ᱢᱮ ᱵᱟᱪᱷᱟᱣ ᱢᱮ।"],
    summaryTitle: "ᱟᱢᱟᱜ ᱞᱟᱦᱟᱱ ᱥᱟᱞᱟᱦ ᱥᱟᱨᱟᱝᱥ", summaryDescription: "ᱧᱮᱞ, ᱰᱟᱩᱱᱞᱳᱰ, ᱥᱟᱵ ᱟᱨ ᱠᱩᱞ ᱴᱷᱟᱶ ᱵᱟᱪᱷᱟᱣ ᱢᱮ। ᱠᱞᱤᱱᱤᱠ ᱟᱨᱡᱤ ᱧᱮᱞᱟ।",
    patientDetails: "ᱨᱩᱣᱟᱹᱲᱤᱡ ᱮᱢ ᱵᱤᱵᱨᱚᱱ", clinicalDisclaimer: "ᱱᱚᱣᱟ ᱨᱚᱜ ᱪᱤᱱᱦᱟᱹ ᱵᱟᱝ। ᱰᱟᱠᱛᱟᱨ ᱫᱚ ᱧᱮᱞ ᱡᱟᱹᱨᱩᱲᱟ।",
    chooseDoctor: "ᱰᱟᱠᱛᱟᱨ ᱵᱟᱝᱠᱷᱟᱱ ᱠᱞᱤᱱᱤᱠ ᱵᱟᱪᱷᱟᱣ", chooseDoctorDescription: "ᱴᱷᱟᱶ ᱵᱟᱪᱷᱟᱣ ᱟᱨ ᱱᱤᱥᱴᱟᱹ ᱢᱟᱲᱟᱝ ᱥᱟᱨᱟᱝᱥ ᱵᱟᱝ ᱠᱩᱞᱚᱜᱼᱟ।",
    selectDoctor: "ᱰᱟᱠᱛᱟᱨ ᱯᱟᱱᱛᱮ/ᱵᱟᱪᱷᱟᱣ", sendSummary: "ᱵᱟᱪᱷᱟᱣ ᱰᱟᱠᱛᱟᱨ ᱛᱷᱮᱱ ᱥᱟᱨᱟᱝᱥ ᱠᱩᱞ", savePng: "PNG ᱥᱟᱵ", savePdf: "PDF ᱥᱟᱵ",
    openRecords: "ᱥᱮᱬᱟ ᱨᱮᱠᱚᱨᱰ ᱡᱷᱤᱡ", bookAppointment: "ᱢᱮᱞᱟᱯ ᱵᱩᱠ",
  },
};

// --- Helpers ---
function fileToJpegBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function extractFacts(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.filter(l => /\d/.test(l) || /mg|ml|mcg|high|low|positive|negative|abnormal/i.test(l)).slice(0, 5);
}

const SAFETY_QUESTIONS = [
  { id: "chest_pain", text: "Are you experiencing severe or crushing chest pain right now?" },
  { id: "breathing", text: "Are you having severe difficulty breathing or gasping for air?" },
  { id: "consciousness", text: "Have you passed out, fainted, or felt extremely confused today?" },
  { id: "stroke", text: "Do you have any sudden weakness, numbness, or difficulty speaking?" },
  { id: "bleeding", text: "Are you experiencing any severe, uncontrollable bleeding?" },
  { id: "allergy", text: "Do you have sudden swelling of your face, lips, or throat?" }
];

// --- Components ---
function TapChoice({ value, options, onChange, description, translate = (text) => text }: { value: string, options: string[], onChange: (v: string) => void, description?: string, translate?: (text: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={isSelected}
            data-sr-description={description ? `${translate(opt)}. ${translate(description)}` : translate(opt)}
            className={`px-5 py-3 rounded-xl border-2 text-sm sm:text-base font-semibold transition-all duration-200 ${
              isSelected 
                ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]' 
                : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function VoiceTextInput({ value, onChange, label, placeholder, description, currentLang, id }: { value: string, onChange: (v: string) => void, label: string, placeholder: string, description: string, currentLang: any, id: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [voicePreview, setVoicePreview] = useState("");
  const [voiceNeedsReview, setVoiceNeedsReview] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);
  const voiceFinalTranscriptRef = useRef("");
  const voiceInterimTranscriptRef = useRef("");
  const voiceConfidenceSamplesRef = useRef<number[]>([]);
  const tr = (source: string) => translatePreConsultation(currentLang?.code ?? "en", source);
  
  const stopVoice = () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
  };
  
  const startVoice = () => {
    const hasSpeech = ("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window);
    if (!hasSpeech) {
      setVoiceMessage(tr("Voice input not supported in this browser. Please type your answer."));
      return;
    }
    setVoiceMessage(null);
    setVoicePreview("");
    setVoiceNeedsReview(false);
    voiceFinalTranscriptRef.current = "";
    voiceInterimTranscriptRef.current = "";
    voiceConfidenceSamplesRef.current = [];

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = currentLang?.sttCode || 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;
    
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const alt = res[0];
        if (!alt) continue;
        if (res.isFinal) {
          voiceFinalTranscriptRef.current = `${voiceFinalTranscriptRef.current} ${alt.transcript}`.trim();
          if (alt.confidence > 0) voiceConfidenceSamplesRef.current.push(alt.confidence);
        } else {
          interim = `${interim} ${alt.transcript}`.trim();
        }
      }
      voiceInterimTranscriptRef.current = interim;
      const full = `${voiceFinalTranscriptRef.current} ${interim}`.trim();
      if (full) {
        const samples = voiceConfidenceSamplesRef.current;
        const conf = samples.length ? samples.reduce((a,b)=>a+b,0)/samples.length : null;
        setVoicePreview(full);
        setVoiceNeedsReview(conf === null || conf < 0.55);
      }
    };
    
    recognition.onerror = (e: any) => {
      if (e.error === 'aborted' && !shouldKeepListeningRef.current) return;
      setVoiceMessage(tr("Voice recognition issue. Please try again or type."));
      shouldKeepListeningRef.current = false;
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        setTimeout(() => { if(shouldKeepListeningRef.current) { try{ recognition.start() }catch(e){} } }, 150);
        return;
      }
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;
    try { recognition.start(); setIsRecording(true); } catch { shouldKeepListeningRef.current = false; setIsRecording(false); setVoiceMessage(tr("Could not start microphone. Please type your answer.")); }
  };
  
  const handleToggle = () => isRecording ? stopVoice() : startVoice();
  const handleUseText = () => {
    onChange(value ? `${value} ${voicePreview}`.trim() : voicePreview);
    setVoicePreview("");
    setVoiceNeedsReview(false);
  };
  const handleTypeInstead = () => {
    stopVoice();
    setVoicePreview("");
    setVoiceNeedsReview(false);
    setVoiceMessage(null);
  };

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.abort?.();
    };
  }, [currentLang?.sttCode]);
  
  return (
    <div className="space-y-3" data-sr-description={description}>
      {label && <Label htmlFor={id} className="text-base font-semibold text-foreground block">{label}</Label>}
      <div className="relative">
        <Textarea 
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[120px] pr-14 text-base resize-none bg-background shadow-sm"
        />
        <Button
          type="button"
          size="icon"
          variant={isRecording ? "destructive" : "secondary"}
          className={`absolute bottom-3 right-3 h-12 w-12 rounded-full shadow-md transition-transform ${isRecording ? "animate-pulse" : "hover:scale-105"}`}
          onClick={handleToggle}
          aria-label={tr(isRecording ? "Stop recording" : "Start recording")}
          data-sr-description={tr("Start or stop voice input for this answer. You can always type instead.")}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
      </div>
      
      {isRecording && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700 text-sm border border-red-200 shadow-sm" aria-live="polite">
          <span className="font-bold mr-2">{tr("Listening...")}</span>
          {tr("Speak naturally. Tap the microphone again when you are finished.")}
        </div>
      )}
      
      {voiceMessage && (
        <div className="rounded-lg bg-amber-50 p-4 text-amber-800 text-sm border border-amber-200 shadow-sm" aria-live="polite">
          {voiceMessage}
        </div>
      )}
      
      {voicePreview && !isRecording && (
        <div className={`rounded-xl border-2 p-4 shadow-sm ${voiceNeedsReview ? "border-amber-300 bg-amber-50" : "border-primary/40 bg-primary/5"}`}>
          <p className="text-sm font-semibold mb-2 text-foreground">{tr("Review what we heard:")}</p>
          <Textarea 
            value={voicePreview}
            onChange={(e) => { setVoicePreview(e.target.value); setVoiceNeedsReview(true); }}
            className="mb-3 bg-background border-border"
            aria-label={tr("Edit transcribed voice text")}
            data-sr-description={tr("Review and edit the words recognized from your voice before using them.")}
          />
          {voiceNeedsReview && (
            <p className="text-xs text-amber-700 mb-3 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {tr("Please check this carefully. It might have errors.")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleUseText} size="sm" className="font-semibold px-4" type="button">{tr("Use this text")}</Button>
            <Button onClick={startVoice} size="sm" variant="outline" className="bg-background" type="button">{tr("Repeat")}</Button>
            <Button onClick={handleTypeInstead} size="sm" variant="ghost" type="button">{tr("Type instead")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function PreConsultationPage() {
  const { user } = useUser();
  const userId = user?.id || "guest";
  const { language: currentLang, setLanguageCode, languages } = useLanguage();
  const { isEnabled: screenReaderEnabled, speakAi } = useScreenReader();
  usePreConsultationLocalization(currentLang.code);
  const tr = (source: string) => translatePreConsultation(currentLang.code, source);
  const pcText = PRECONSULT_TEXT.en;
  const extractImage = useExtractReportImage();
  const createPreConsultation = useCreatePreConsultation();

  const { data: pastConsultations, isLoading: loadingHistory } = useListPatientPreConsultations(
    { callerUserId: userId, patientUserId: userId },
    { query: { enabled: !!userId, queryKey: getListPatientPreConsultationsQueryKey({ callerUserId: userId, patientUserId: userId }) } }
  );

  const storageKey = `sushruth_intake_${userId}`;

  const [data, setData] = useState<IntakeData>(defaultIntake);
  const [isLoaded, setIsLoaded] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [doctorSearch, setDoctorSearch] = useState({ name: "", hospital: "", city: "" });
  const [appliedDoctorSearch, setAppliedDoctorSearch] = useState({ name: "", hospital: "", city: "" });
  const [doctorSearchPerformed, setDoctorSearchPerformed] = useState(false);
  const [doctorSearchConfirmed, setDoctorSearchConfirmed] = useState(false);
  const [sentConsultationId, setSentConsultationId] = useState<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setData(restoreIntakeDraft(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse intake data");
      }
    }
    setIsLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [data, isLoaded, storageKey]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (screenReaderEnabled && data.consent.accepted) {
      const stageName = tr(pcText.stages[data.stage - 1] ?? pcText.summaryTitle);
      speakAi(`${tr("Stage")} ${data.stage} ${tr("of")} 9. ${stageName}`);
    }
  }, [data.stage, screenReaderEnabled]);

  const updateData = (updater: (prev: IntakeData) => IntakeData) =>
    setData(prev => ({ ...updater(prev), updatedAt: new Date().toISOString() }));

  const nextStage = () => {
    updateData(prev => {
      let hpiUpdate = prev.hpi;
      if (prev.stage === 2) {
        const cat = classifyComplaint(prev.mainProblem.complaint);
        if (cat !== prev.hpi.category) {
          hpiUpdate = { category: cat, answers: {} };
        }
      }
      return { ...prev, stage: prev.stage + 1, hpi: hpiUpdate };
    });
  };

  const prevStage = () => updateData(prev => ({ ...prev, stage: Math.max(1, prev.stage - 1) }));

  const handleSafetyChange = (id: string, val: string) => {
    updateData(prev => {
      const safety = { ...prev.safety, [id]: val };
      const redFlagIds = derivePotentialRedFlags(safety, prev.hpi.answers);
      const redFlags = redFlagIds.map(id => SAFETY_QUESTIONS.find(q => q.id === id)?.text ?? id);
      return { ...prev, safety, redFlags, status: redFlags.length > 0 ? 'Urgent' : 'Incomplete' };
    });
  };

  const handleHpiAnswer = (id: string, value: string) => {
    updateData(prev => {
      const answers = { ...prev.hpi.answers, [id]: value };
      const redFlagIds = derivePotentialRedFlags(prev.safety, answers);
      const redFlags = redFlagIds.map(flagId =>
        flagId === "self_harm"
          ? "Patient reported thoughts of harming self or another person."
          : SAFETY_QUESTIONS.find(q => q.id === flagId)?.text ?? flagId
      );
      return {
        ...prev,
        hpi: { ...prev.hpi, answers },
        redFlags,
        status: redFlags.length > 0 ? "Urgent" : "Incomplete",
      };
    });
  };

  const processDocumentFile = async (file: File) => {
    const newDoc = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: file.type,
      date: new Date().toISOString(),
      dataUrl: "",
      extractedText: "",
      facts: [] as string[],
      needsVerification: true
    };

    if (file.type.startsWith("image/")) {
      try {
        const { base64, mimeType } = await fileToJpegBase64(file);
        newDoc.dataUrl = `data:${mimeType};base64,${base64}`;
        // Optimistic append
        updateData(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
        
        const res = await extractImage.mutateAsync({ data: { imageBase64: base64, mimeType, language: currentLang.aiName } as any });
        updateData(prev => {
          const docs = [...prev.documents];
          const idx = docs.findIndex(d => d.id === newDoc.id);
          if (idx >= 0 && res.extractedText) {
            docs[idx].extractedText = res.extractedText;
            docs[idx].facts = extractFacts(res.extractedText);
          }
          return { ...prev, documents: docs };
        });
      } catch (err) {
        updateData(prev => {
          const docs = [...prev.documents];
          const idx = docs.findIndex(d => d.id === newDoc.id);
          if (idx >= 0) docs[idx].needsVerification = true;
          return { ...prev, documents: docs };
        });
      }
    } else if (file.type === "application/pdf") {
      newDoc.needsVerification = true;
      updateData(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
    }
  };

  const removeDoc = (id: string) => {
    updateData(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }));
  };

  const selectedDoctorMapQuery = [
    appliedDoctorSearch.name,
    appliedDoctorSearch.hospital,
    appliedDoctorSearch.city,
  ].filter(Boolean).join(", ");
  const selectedDoctorMapUrl = selectedDoctorMapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDoctorMapQuery)}`
    : "";
  const selectedDoctorMapEmbedUrl = selectedDoctorMapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(selectedDoctorMapQuery)}&output=embed`
    : "";

  const searchDoctors = () => {
    const nextSearch = {
      name: doctorSearch.name.trim(),
      hospital: doctorSearch.hospital.trim(),
      city: doctorSearch.city.trim(),
    };
    if (!nextSearch.name && !nextSearch.hospital && !nextSearch.city) {
      setSubmissionError(tr("Enter a doctor name, hospital or clinic, or location to search."));
      return;
    }
    setSubmissionError("");
    setAppliedDoctorSearch(nextSearch);
    setDoctorSearchPerformed(true);
    setDoctorSearchConfirmed(false);
  };

  const pendingVerification = "Pending Practitioner Verification";
  const notReported = "Not reported";
  const hpiQuestions = getAdaptiveQuestions({
    complaint: data.mainProblem.complaint,
    severity: data.mainProblem.severity,
    medicalHistory: data.medicalHistory.conditions,
    answers: data.hpi.answers,
  });
  const hpiRows: CaseSheetRow[] = hpiQuestions
    .filter(question => data.hpi.answers[question.id])
    .map(question => ({
      label: question.text,
      value: data.hpi.answers[question.id],
      source: "Patient-reported",
    }));

  const caseSheetSections: CaseSheetSection[] = [
    {
      number: 1,
      title: "Patient Information",
      rows: [
        { label: "Patient", value: user?.fullName || "Patient", source: "Patient-reported" },
        { label: "Age", value: data.basic.age ? `${data.basic.age} years` : notReported, source: "Patient-reported" },
        { label: "Gender", value: data.basic.gender || notReported, source: "Patient-reported" },
        { label: "Height / Weight", value: [data.basic.height && `${data.basic.height} cm`, data.basic.weight && `${data.basic.weight} kg`].filter(Boolean).join(" / ") || notReported, source: "Patient-reported" },
        { label: "Preferred language", value: `${currentLang.nativeName} (${currentLang.name})`, source: "Patient-reported" },
      ],
    },
    {
      number: 2,
      title: "Chief Complaint",
      rows: [
        { label: "Presenting complaint", value: data.mainProblem.complaint || notReported, source: "Patient-reported" },
        { label: "Onset", value: data.mainProblem.onset || notReported, source: "Patient-reported" },
        { label: "Reported severity", value: data.mainProblem.severity || notReported, source: "Patient-reported" },
      ],
    },
    {
      number: 3,
      title: "History of Present Illness (HPI)",
      rows: hpiRows.length ? hpiRows : [{ label: "Additional HPI", value: notReported, source: "Patient-reported" }],
    },
    {
      number: 4,
      title: "Past Medical & Surgical History",
      rows: [
        { label: "Past medical conditions", value: data.medicalHistory.conditions || "None reported", source: "Patient-reported" },
        { label: "Past surgical history", value: "Not separately reported", source: "Patient-reported" },
      ],
    },
    {
      number: 5,
      title: "Medications & Allergies",
      rows: [
        { label: "Current medications", value: data.medicalHistory.medications || "None reported", source: "Patient-reported" },
        { label: "Drug / other allergies", value: data.medicalHistory.allergies || "None reported", source: "Patient-reported" },
      ],
    },
    {
      number: 6,
      title: "Personal / Family History",
      rows: [
        { label: "Personal and lifestyle history", value: data.medicalHistory.lifestyle || notReported, source: "Patient-reported" },
        { label: "Family history", value: "Not separately reported", source: "Patient-reported" },
      ],
    },
    {
      number: 7,
      title: "Review of Systems",
      rows: [
        { label: "General / sleep", value: data.ayush.sleep || notReported, source: "Patient-reported" },
        { label: "Gastrointestinal / bowel", value: data.ayush.bowel || notReported, source: "Patient-reported" },
        { label: "Appetite", value: data.ayush.appetite || notReported, source: "Patient-reported" },
        { label: "Genitourinary / bladder", value: data.ayush.bladder || notReported, source: "Patient-reported" },
      ],
    },
    {
      number: 8,
      title: "Investigations & Previous Reports",
      rows: data.documents.length
        ? data.documents.flatMap(document => {
            const source: CaseSheetSource = document.facts.length ? "AI-structured" : "Patient-reported";
            return [{
              label: `${document.name} · ${document.date ? new Date(document.date).toLocaleDateString() : "Date not provided"}`,
              value: document.facts.length ? document.facts.join("; ") : document.extractedText || "Attached; structured extraction unavailable",
              source,
            }];
          })
        : [{ label: "Documents", value: "No previous reports attached", source: "Patient-reported" }],
    },
    {
      number: 9,
      title: "Red-Flag Alerts",
      tone: data.redFlags.length ? "alert" : "default",
      rows: [{
        label: data.redFlags.length ? "Potential red flags detected" : "Red-flag screen",
        value: data.redFlags.length ? data.redFlags.map(tr).join("; ") : "No red flags identified from the submitted responses",
        source: "AI-structured",
      }],
    },
    {
      number: 10,
      title: "AYUSH History Summary",
      tone: "ayush",
      rows: [
        { label: "Dashavidha Pariksha", value: "Patient-reported parameters captured below", source: "Patient-reported" },
        { label: "Prakriti", value: data.ayush.prakriti || notReported, source: "Patient-reported" },
        { label: "Vikriti", value: data.ayush.vikriti || notReported, source: "Patient-reported" },
        { label: "Sara", value: data.ayush.sara || notReported, source: "Patient-reported" },
        { label: "Samhanana", value: data.ayush.samhanana || notReported, source: "Patient-reported" },
        { label: "Pramana", value: data.ayush.pramana || notReported, source: "Patient-reported" },
        { label: "Satmya", value: data.ayush.satmya || notReported, source: "Patient-reported" },
        { label: "Sattva", value: data.ayush.sattva || notReported, source: "Patient-reported" },
        { label: "Ahara Shakti", value: data.ayush.aharaShakti || notReported, source: "Patient-reported" },
        { label: "Vyayama Shakti", value: data.ayush.vyayamashakti || notReported, source: "Patient-reported" },
        { label: "Vaya", value: data.ayush.vaya || notReported, source: "Patient-reported" },
        { label: "Ahara", value: data.ayush.appetite || notReported, source: "Patient-reported" },
        { label: "Vihara", value: data.medicalHistory.lifestyle || notReported, source: "Patient-reported" },
        { label: "Agni", value: data.ayush.aharaShakti || data.ayush.appetite || notReported, source: "Patient-reported" },
        { label: "Koshtha", value: data.ayush.bowel || notReported, source: "Patient-reported" },
        { label: "Nidana / clinical progression", value: [data.ayush.triggers && `Triggers: ${data.ayush.triggers}`, (data.ayush.samprapti || data.ayush.progression) && `Progression: ${data.ayush.samprapti || data.ayush.progression}`].filter(Boolean).join(" · ") || notReported, source: "Patient-reported" },
      ],
    },
  ];

  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[character] || character));

  const renderCaseSheetHtml = () => caseSheetSections.map(section => `
    <section class="case-section ${section.tone || "default"}">
      <h2><span>${section.number}</span>${escapeHtml(section.title)}</h2>
      <table><tbody>${section.rows.map(row => `
        <tr>
          <th>${escapeHtml(row.label)}</th>
          <td>${escapeHtml(row.value)}<small>${escapeHtml(row.source || "Patient-reported")} · ${pendingVerification}</small></td>
        </tr>`).join("")}
      </tbody></table>
    </section>`).join("");

  const downloadSummaryPng = () => {
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    if (!measureCtx) return;

    const wrapCanvasText = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D) => {
      const lines: string[] = [];
      let currentLine = "";
      text.split(/\s+/).forEach(word => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(candidate).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = candidate;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    const rowHeights = new Map<string, number>();
    let totalHeight = 430 + (caseSheetSections.length * 72);

    caseSheetSections.forEach((section, sectionIdx) => {
      section.rows.forEach((row, rowIndex) => {
        measureCtx.font = "700 18px Arial";
        const labelLines = Math.max(1, wrapCanvasText(row.label, 330, measureCtx).length);
        measureCtx.font = "19px Arial";
        const valueLines = Math.max(1, wrapCanvasText(row.value, 850, measureCtx).length);

        const maxLines = Math.max(labelLines, valueLines);
        const rowHeight = 74 + (maxLines > 2 ? (maxLines - 2) * 22 : 0);
        rowHeights.set(`${sectionIdx}-${rowIndex}`, rowHeight);
        totalHeight += rowHeight;
      });
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f766e";
    ctx.fillRect(0, 0, canvas.width, 18);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 42px Arial";
    ctx.fillText("PRE-CONSULTATION CASE SHEET", 64, 86);
    ctx.fillStyle = "#475569";
    ctx.font = "22px Arial";
    ctx.fillText("Sushruth · Patient-reported clinical intake", 64, 124);
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(916, 48, 420, 54);
    ctx.strokeStyle = "#f59e0b";
    ctx.strokeRect(916, 48, 420, 54);
    ctx.fillStyle = "#92400e";
    ctx.font = "700 18px Arial";
    ctx.fillText(pendingVerification.toUpperCase(), 938, 82);

    let y = 174;
    caseSheetSections.forEach((section, sectionIdx) => {
      const headerColor = section.tone === "alert" ? "#991b1b" : section.tone === "ayush" ? "#115e59" : "#1e3a5f";
      ctx.fillStyle = headerColor;
      ctx.fillRect(48, y, 1304, 52);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 22px Arial";
      ctx.fillText(`${section.number}. ${section.title.toUpperCase()}`, 68, y + 34);
      y += 52;
      section.rows.forEach((row, rowIndex) => {
        const rowHeight = rowHeights.get(`${sectionIdx}-${rowIndex}`) || 74;
        ctx.fillStyle = rowIndex % 2 === 0 ? "#f8fafc" : "#ffffff";
        ctx.fillRect(48, y, 1304, rowHeight);
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(48, y, 1304, rowHeight);

        ctx.fillStyle = "#475569";
        ctx.font = "700 18px Arial";
        wrapCanvasText(row.label, 330, ctx).forEach((line, index) => ctx.fillText(line, 68, y + 27 + index * 21));

        ctx.fillStyle = "#0f172a";
        ctx.font = "19px Arial";
        wrapCanvasText(row.value, 850, ctx).forEach((line, index) => ctx.fillText(line, 420, y + 27 + index * 22));

        ctx.fillStyle = "#64748b";
        ctx.font = "14px Arial";
        ctx.fillText(`${row.source || "Patient-reported"} · ${pendingVerification}`, 420, y + rowHeight - 10);

        y += rowHeight;
      });
      y += 20;
    });
    ctx.fillStyle = "#475569";
    ctx.font = "700 16px Arial";
    ctx.fillText(pcText.clinicalDisclaimer, 48, canvas.height - 42);
    const link = document.createElement("a");
    link.download = `sushruth-pre-consultation-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const printSummaryPdf = () => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    const direction = ["ur", "ks", "sd"].includes(currentLang.code) ? "rtl" : "ltr";
    popup.document.write(`<html lang="${currentLang.code}" dir="${direction}"><head><title>Pre-Consultation Case Sheet</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;color:#0f172a;line-height:1.35}
      header{border-top:6px solid #0f766e;border-bottom:2px solid #cbd5e1;padding:18px 4px 14px;display:flex;justify-content:space-between;gap:20px}
      h1{font-size:24px;margin:0;color:#0f172a;letter-spacing:.04em}.sub{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.12em;margin-top:5px}
      .status{align-self:flex-start;background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:7px 10px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap}
      .case-section{margin:14px 0;break-inside:avoid}.case-section h2{display:flex;align-items:center;gap:8px;background:#1e3a5f;color:white;font-size:13px;text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;margin:0}
      .case-section h2 span{display:inline-grid;place-items:center;background:white;color:#1e3a5f;width:20px;height:20px;border-radius:50%}.case-section.alert h2{background:#991b1b}.case-section.ayush h2{background:#115e59}
      table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #cbd5e1;padding:7px 9px;text-align:left;vertical-align:top}th{width:30%;background:#f8fafc;color:#475569}td{font-weight:600;white-space:pre-wrap}small{display:block;margin-top:4px;color:#64748b;font-size:8px;font-weight:400;text-transform:uppercase;letter-spacing:.03em}
      footer{border-top:2px solid #cbd5e1;margin-top:18px;padding-top:9px;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:center}
    </style></head><body><header><div><h1>PRE-CONSULTATION CASE SHEET</h1><div class="sub">Sushruth · ${escapeHtml(pcText.patientDetails)}</div></div><div class="status">${pendingVerification}</div></header>${renderCaseSheetHtml()}<footer>${escapeHtml(pcText.clinicalDisclaimer)}</footer><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const handleSubmitFinal = async () => {
    if (!doctorSearchConfirmed || !selectedDoctorMapQuery) {
      setSubmissionError(tr("Please search Google Maps and confirm the doctor or clinic before sending this summary."));
      return;
    }
    const finalData = {
      ...data,
      status: data.redFlags.length > 0 ? 'Urgent' : 'Ready for Consultation',
      stage: 9,
      submittedAt: new Date().toISOString(),
      summary: {
        patientReported: {
          chiefComplaint: data.mainProblem.complaint,
          onset: data.mainProblem.onset,
          severity: data.mainProblem.severity,
           hpi: getAdaptiveQuestions({
             complaint: data.mainProblem.complaint,
             severity: data.mainProblem.severity,
             medicalHistory: data.medicalHistory.conditions,
             answers: data.hpi.answers,
           }).map(question => ({
             questionId: question.id,
             question: question.text,
             clinicalField: question.clinicalField,
             answer: data.hpi.answers[question.id] || "Not reported",
             source: "patient-reported",
           }))
        },
        aiStructured: {
          medicalHistory: data.medicalHistory,
          ayush: data.ayush,
          documentsFacts: data.documents.map(d => ({ name: d.name, facts: d.facts })),
          redFlags: data.redFlags
        },
         routing: {
           doctorId: null,
           doctorName: appliedDoctorSearch.name || "Doctor selected through Google Maps",
           hospital: appliedDoctorSearch.hospital || "Not specified",
           city: appliedDoctorSearch.city || "Not specified",
           googleMapsQuery: selectedDoctorMapQuery,
           approvalStatus: "pending_clinic_review",
         },
        verificationPending: true
      }
    };

    setSubmissionError("");
    try {
      const saved = await createPreConsultation.mutateAsync({
        data: {
          callerUserId: userId,
          patientUserId: userId,
          patientName: user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || "Patient",
          language: currentLang.code,
          intakeData: finalData as any
        }
      });
      setData(finalData as IntakeData);
      setSentConsultationId(saved.id);
      localStorage.removeItem(storageKey);
    } catch {
      setSubmissionError(tr("Your intake could not be submitted. Please check your connection and try again; your answers remain saved on this device."));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processDocumentFile(file);
    e.target.value = "";
  };

  if (!isLoaded) return <div className="p-8 text-center text-muted-foreground">{tr("Loading…")}</div>;

  if (declined) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center mt-12 space-y-6">
        <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
        <h2 className="text-2xl font-bold">Consent Declined</h2>
        <p className="text-muted-foreground">We respect your privacy. The clinical intake cannot proceed without consent. You can safely leave this page.</p>
        <Link href="/dashboard"><Button>Return to Dashboard</Button></Link>
      </div>
    );
  }

  const LanguagePicker = ({ id }: { id: string }) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <Label htmlFor={id} className="shrink-0 text-sm font-semibold">
        {tr("Choose your language")}
      </Label>
      <Select value={currentLang.code} onValueChange={setLanguageCode}>
        <SelectTrigger
          id={id}
          className="w-full sm:w-[220px]"
          data-sr-description={`${tr("Choose your language")}. ${tr("Voice recognition will use this language and its Indian regional speech setting.")}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              {language.nativeName} ({language.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (!data.consent.accepted) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 mt-6">
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-primary/5 rounded-t-xl pb-8">
            <div className="mx-auto bg-primary text-primary-foreground w-16 h-16 flex items-center justify-center rounded-2xl mb-4 shadow-md">
              <ClipboardList className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl text-center font-bold">Before we begin</CardTitle>
            <CardDescription className="text-center text-base mt-2">
              Sushruth will guide you through a clinical intake to prepare for your consultation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-8 pb-8 px-6 sm:px-10">
            <div className="space-y-3">
              <Label htmlFor="intake-language" className="text-base font-semibold" data-sr-description={`${tr("Choose your language")}. ${tr("Voice recognition will use this language and its Indian regional speech setting.")}`}>
                Choose your language
              </Label>
              <select
                id="intake-language"
                value={currentLang.code}
                onChange={(event) => setLanguageCode(event.target.value)}
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.nativeName} ({language.name})
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                Voice recognition will use this language and its Indian regional speech setting.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Mic className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-lg">Voice Transcription</h4>
                  <p className="text-muted-foreground">You can use your voice to answer questions. Your audio is processed directly by the browser for transcription.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <FileText className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-lg">Document Processing</h4>
                  <p className="text-muted-foreground">Any reports you upload will be analyzed by AI to extract key medical facts to help your doctor.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Stethoscope className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-lg">Clinical Review</h4>
                  <p className="text-muted-foreground">A certified clinician will review all your answers. Sushruth does not diagnose or treat medical conditions.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4 px-6 sm:px-10 pb-8 pt-4 bg-muted/30">
            <Button className="w-full h-14 text-lg rounded-xl" onClick={() => updateData(p => ({ ...p, consent: { accepted: true, timestamp: new Date().toISOString() } }))}>
              I Understand & Accept
            </Button>
            <Button variant="outline" className="w-full h-14 text-lg rounded-xl" onClick={() => setDeclined(true)}>
              Decline
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Common UI Layout wrapper
  const Layout = ({ title, desc, children, disableNext = false, onNext = nextStage, nextLabel = "Continue" }: any) => {
    const stageNames = pcText.stages;
    const progress = (data.stage / 9) * 100;
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-32">
        <div className="mb-5">
          <LanguagePicker id={`intake-language-stage-${data.stage}`} />
        </div>
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
            <span>{tr("Stage")} {data.stage} {tr("of")} 9: {tr(stageNames[data.stage - 1])}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {data.redFlags.length > 0 && data.stage < 9 && (
          <Alert className="mb-8 border-red-500 bg-red-50 shadow-md" aria-live="assertive">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <AlertTitle className="text-red-800 font-bold text-lg">Urgent Medical Attention Advised</AlertTitle>
            <AlertDescription className="text-red-700 mt-2 text-base">
              Your symptoms suggest a potentially serious condition. 
              <strong className="block mt-2 text-lg">Please call 108 for an ambulance or go to the nearest emergency room immediately.</strong>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-2 shadow-sm mb-8">
          <CardHeader className="bg-primary/5 rounded-t-xl border-b border-border/50 pb-6">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">{title}</CardTitle>
            {desc && <CardDescription className="text-base mt-2 text-muted-foreground">{desc}</CardDescription>}
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-8">
            {children}
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t p-4 z-10 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)]">
          <div className="max-w-3xl mx-auto flex gap-4">
            {data.stage > 1 && (
              <Button variant="outline" size="lg" className="h-14 px-6 rounded-xl font-semibold" onClick={prevStage}>
                 <ChevronLeft className="mr-2 h-5 w-5" /> {tr("Back")}
              </Button>
            )}
            <Button 
              size="lg" 
              className="h-14 flex-1 rounded-xl font-semibold text-lg" 
              onClick={onNext} 
              disabled={disableNext}
            >
              {tr(nextLabel)} {nextLabel !== "Submit" && <ChevronRight className="ml-2 h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // --- STAGES ---
  
  if (data.stage === 1) {
    return Layout({
      title: pcText.stages[0],
      desc: pcText.stageDescriptions[0],
      disableNext: !data.basic.age || !data.basic.gender,
      children: (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3" data-sr-description={tr("Age in years. Enter your current age.")}>
            <Label htmlFor="age" className="text-base font-semibold">Age (years) *</Label>
            <Input id="age" type="number" placeholder="e.g. 65" className="h-14 text-lg rounded-xl" value={data.basic.age} onChange={e => updateData(p => ({...p, basic: {...p.basic, age: e.target.value}}))} />
          </div>
            <div className="space-y-3" data-sr-description={tr("Gender. Choose the option that describes you.")}>
            <Label className="text-base font-semibold">Gender *</Label>
             <TapChoice value={data.basic.gender} options={["Male", "Female", "Other"]} description="Gender. Choose the option that describes you." translate={tr} onChange={v => updateData(p => ({...p, basic: {...p.basic, gender: v}}))} />
          </div>
            <div className="space-y-3" data-sr-description={tr("Weight in kilograms. This field is optional.")}>
            <Label htmlFor="weight" className="text-base font-semibold">Weight (kg) - optional</Label>
            <Input id="weight" type="number" placeholder="e.g. 70" className="h-14 text-lg rounded-xl" value={data.basic.weight} onChange={e => updateData(p => ({...p, basic: {...p.basic, weight: e.target.value}}))} />
          </div>
            <div className="space-y-3" data-sr-description={tr("Height in centimetres. This field is optional.")}>
            <Label htmlFor="height" className="text-base font-semibold">Height (cm) - optional</Label>
            <Input id="height" type="number" placeholder="e.g. 165" className="h-14 text-lg rounded-xl" value={data.basic.height} onChange={e => updateData(p => ({...p, basic: {...p.basic, height: e.target.value}}))} />
          </div>
        </div>
        </>
      ),
    });
  }

  if (data.stage === 2) {
    return Layout({
      title: pcText.stages[1],
      desc: pcText.stageDescriptions[1],
      disableNext: !data.mainProblem.complaint.trim(),
      children: (
        <>
        <VoiceTextInput 
          id="complaint"
          label="Describe your main symptom or problem *" 
          placeholder="e.g. I have had a headache for 3 days..." 
          description="Describe the main health problem you want the doctor to review."
          currentLang={currentLang} 
          value={data.mainProblem.complaint}
          onChange={(v: string) => updateData(p => ({...p, mainProblem: {...p.mainProblem, complaint: v}}))}
        />
        <div className="space-y-3" data-sr-description={tr("Choose when this health problem began.")}>
          <Label className="text-base font-semibold">When did it start?</Label>
          <TapChoice value={data.mainProblem.onset} options={["Today", "A few days ago", "Weeks ago", "Months ago", "Years ago"]} description="Choose when this health problem began." translate={tr} onChange={v => updateData(p => ({...p, mainProblem: {...p.mainProblem, onset: v}}))} />
        </div>
        <div className="space-y-3" data-sr-description={tr("Choose how strongly this problem affects you.")}>
          <Label className="text-base font-semibold">How severe is it?</Label>
          <TapChoice value={data.mainProblem.severity} options={["Mild", "Moderate", "Severe", "Unbearable"]} description="Choose how strongly this problem affects you." translate={tr} onChange={v => updateData(p => ({...p, mainProblem: {...p.mainProblem, severity: v}}))} />
        </div>
        </>
      ),
    });
  }

  if (data.stage === 3) {
    return Layout({
      title: pcText.stages[2],
      desc: pcText.stageDescriptions[2],
      children: (
        <>
        <VoiceTextInput 
          id="conditions"
          label="Do you have any pre-existing medical conditions?" 
          placeholder="e.g. Diabetes, Hypertension..." 
          description="List health conditions that a doctor has previously identified."
          currentLang={currentLang} 
          value={data.medicalHistory.conditions}
          onChange={(v: string) => updateData(p => ({...p, medicalHistory: {...p.medicalHistory, conditions: v}}))}
        />
        <VoiceTextInput 
          id="medications"
          label="Are you currently taking any medications?" 
          placeholder="List your daily pills..." 
          description="List medicines you currently take, including dose if known."
          currentLang={currentLang} 
          value={data.medicalHistory.medications}
          onChange={(v: string) => updateData(p => ({...p, medicalHistory: {...p.medicalHistory, medications: v}}))}
        />
        <VoiceTextInput 
          id="allergies"
          label="Do you have any known allergies?" 
          placeholder="Medications, food, dust..." 
          description="List medicine, food or other allergies."
          currentLang={currentLang} 
          value={data.medicalHistory.allergies}
          onChange={(v: string) => updateData(p => ({...p, medicalHistory: {...p.medicalHistory, allergies: v}}))}
        />
        <VoiceTextInput 
          id="lifestyle"
          label="Any relevant lifestyle habits?" 
          placeholder="e.g. Smoking, alcohol, daily exercise..." 
          description="Describe habits such as smoking, alcohol or regular exercise."
          currentLang={currentLang} 
          value={data.medicalHistory.lifestyle}
          onChange={(v: string) => updateData(p => ({...p, medicalHistory: {...p.medicalHistory, lifestyle: v}}))}
        />
        </>
      ),
    });
  }

  if (data.stage === 4) {
    const questions = getAdaptiveQuestions({
      complaint: data.mainProblem.complaint,
      severity: data.mainProblem.severity,
      medicalHistory: data.medicalHistory.conditions,
      answers: data.hpi.answers,
    });
    return Layout({
      title: pcText.stages[3],
      desc: pcText.stageDescriptions[3],
      disableNext: questions.some(question => question.required && !data.hpi.answers[question.id]?.trim()),
      children: (
        <>
        {questions.map((q) => (
          <div key={q.id} className="space-y-3">
            <VoiceTextInput
              id={`hpi-${q.id}`}
              label={`${q.text}${q.required ? " *" : ""}`}
              placeholder="Speak or type your answer..."
              description="Answer by speaking, typing, or choosing an option when shown."
              currentLang={currentLang}
              value={data.hpi.answers[q.id] || ""}
              onChange={(v: string) => handleHpiAnswer(q.id, v)}
            />
            {q.options && (
              <TapChoice
                value={data.hpi.answers[q.id] || ""}
                options={q.options}
                description={q.text}
                translate={tr}
                onChange={(v: string) => handleHpiAnswer(q.id, v)}
              />
            )}
          </div>
        ))}
        </>
      ),
    });
  }

  if (data.stage === 5) {
    return Layout({
      title: pcText.stages[4],
      desc: pcText.stageDescriptions[4],
      children: (
        <>
        <div className="space-y-8">
          <div className="space-y-3" data-sr-description={tr("Describe your usual appetite and eating pattern.")}>
            <Label className="text-base font-semibold">Appetite & Diet</Label>
            <TapChoice value={data.ayush.appetite} options={["Good/Regular", "Variable", "Poor/Skipping meals", "Craving specific foods"]} description="Describe your usual appetite and eating pattern." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, appetite: v}}))} />
          </div>
          <div className="space-y-3" data-sr-description={tr("Describe how well you usually sleep.")}>
            <Label className="text-base font-semibold">Sleep Quality</Label>
            <TapChoice value={data.ayush.sleep} options={["Sound/Deep", "Trouble falling asleep", "Waking up often", "Excessive/Heavy"]} description="Describe how well you usually sleep." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, sleep: v}}))} />
          </div>
          <div className="space-y-3" data-sr-description={tr("Describe your usual bowel pattern.")}>
            <Label className="text-base font-semibold">Bowel Movements</Label>
            <TapChoice value={data.ayush.bowel} options={["Regular/Normal", "Constipation", "Loose/Frequent", "Irregular"]} description="Describe your usual bowel pattern." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, bowel: v}}))} />
          </div>
          <div className="space-y-3" data-sr-description={tr("Choose the body frame closest to your usual constitution.")}>
            <Label className="text-base font-semibold">Body Frame (Prakriti)</Label>
            <TapChoice value={data.ayush.prakriti} options={["Thin/Slender", "Medium/Muscular", "Broad/Heavy"]} description="Choose the body frame closest to your usual constitution." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, prakriti: v}}))} />
          </div>
          <div className="space-y-3">
            <Label className="text-base font-semibold">Current Imbalance (Vikriti)</Label>
            <TapChoice value={data.ayush.vikriti} options={["No obvious change", "Dryness/Restlessness", "Heat/Irritation", "Heaviness/Sluggishness", "Not sure"]} description="Choose changes from your usual state." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, vikriti: v}}))} />
          </div>
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tissue Quality (Sara)</Label>
            <TapChoice value={data.ayush.sara} options={["Good", "Average", "Poor", "Not sure"]} description="Choose your general tissue strength and nourishment." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, sara: v}}))} />
          </div>
          <div className="space-y-3">
            <Label className="text-base font-semibold">Body Build (Samhanana)</Label>
            <TapChoice value={data.ayush.samhanana} options={["Compact/Strong", "Moderate", "Loose/Delicate", "Not sure"]} description="Choose the closest description of your body build." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, samhanana: v}}))} />
          </div>
          <VoiceTextInput id="pramana" label="Body Measurements (Pramana)" placeholder="Height, weight, or other measurements if known..." description="Provide body measurements if known." currentLang={currentLang} value={data.ayush.pramana} onChange={(v: string) => updateData(p => ({...p, ayush: {...p.ayush, pramana: v}}))} />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Adaptability (Satmya)</Label>
            <TapChoice value={data.ayush.satmya} options={["Adapts easily", "Moderate", "Sensitive to changes", "Not sure"]} description="Describe how easily your body adjusts to food, climate, and routine." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, satmya: v}}))} />
          </div>
          <div className="space-y-3" data-sr-description={tr("Choose your usual capacity for physical activity.")}>
            <Label className="text-base font-semibold">Physical Stamina (Vyayamashakti)</Label>
            <TapChoice value={data.ayush.vyayamashakti} options={["Low (Tire easily)", "Medium", "High (Very active)"]} description="Choose your usual capacity for physical activity." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, vyayamashakti: v}}))} />
          </div>
          <div className="space-y-3" data-sr-description={tr("Choose the mental or emotional pattern closest to your usual state.")}>
            <Label className="text-base font-semibold">General Mind/Mood (Sattva)</Label>
            <TapChoice value={data.ayush.sattva} options={["Anxious/Restless", "Irritable/Angry", "Calm/Slow"]} description="Choose the mental or emotional pattern closest to your usual state." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, sattva: v}}))} />
          </div>
          <div className="space-y-3">
            <Label className="text-base font-semibold">Digestive Capacity (Ahara Shakti)</Label>
            <TapChoice value={data.ayush.aharaShakti} options={["Strong", "Moderate", "Low", "Variable", "Not sure"]} description="Choose how well you usually digest food." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, aharaShakti: v}}))} />
          </div>
          <div className="space-y-3">
            <Label className="text-base font-semibold">Life Stage (Vaya)</Label>
            <TapChoice value={data.ayush.vaya} options={["Child/Adolescent", "Adult", "Older adult"]} description="Choose your current life stage." translate={tr} onChange={v => updateData(p => ({...p, ayush: {...p.ayush, vaya: v}}))} />
          </div>
          <div className="pt-4 border-t">
            <VoiceTextInput 
              id="triggers"
              label="What makes your problem worse? (Triggers / Nidana)" 
              placeholder="e.g. Cold weather, eating spicy food, stress..." 
              description="Describe situations, foods or activities that make the problem worse."
              currentLang={currentLang} 
              value={data.ayush.triggers}
              onChange={(v: string) => updateData(p => ({...p, ayush: {...p.ayush, triggers: v}}))}
            />
          </div>
          <VoiceTextInput id="samprapti" label="How has the problem developed? (Samprapti)" placeholder="Describe how it began and changed over time..." description="Describe the progression of the current problem without interpreting it as a diagnosis." currentLang={currentLang} value={data.ayush.samprapti} onChange={(v: string) => updateData(p => ({...p, ayush: {...p.ayush, samprapti: v}}))} />
        </div>
        </>
      ),
    });
  }

  if (data.stage === 6) {
    return Layout({
      title: pcText.stages[5],
      desc: pcText.stageDescriptions[5],
      children: (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Button
            data-testid="button-pre-consultation-take-photo"
            data-sr-description={tr("Use the camera to photograph a medical document.")}
            variant="outline"
            className="h-24 flex-col gap-2 rounded-xl text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
            onClick={() => setCameraOpen(true)}
          >
            <Camera className="h-8 w-8" />
            {tr("Take Photo")}
          </Button>
          <Button data-sr-description={tr("Choose an image or PDF medical document from your device.")} variant="outline" className="h-24 flex-col gap-2 rounded-xl text-primary border-primary/30 bg-primary/5 hover:bg-primary/10" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-8 w-8" /> Upload File
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        </div>
        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={processDocumentFile}
          title={tr("Take Photo")}
        />
        
        <div className="space-y-4">
          {data.documents.map(doc => (
            <Card key={doc.id} className="overflow-hidden border shadow-sm">
              <div className="flex items-start gap-4 p-4">
                {doc.dataUrl ? (
                  <img src={doc.dataUrl} alt={doc.name} className="w-20 h-20 object-cover rounded-lg border bg-muted" />
                ) : (
                  <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
                    <FileText className="h-8 w-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                     {new Date(doc.date).toLocaleDateString()} • {doc.extractedText ? "OCR extracted — verification required" : "Pending manual review"}
                  </p>
                  {doc.facts.length > 0 && (
                    <div className="bg-muted/50 rounded p-2 text-xs text-foreground space-y-1 mt-2">
                      <p className="font-semibold mb-1">Potential Findings found:</p>
                      {doc.facts.map((f, i) => <p key={i}>• {f}</p>)}
                    </div>
                  )}
                </div>
                <Button aria-label={tr("Remove this document from the intake.")} data-sr-description={tr("Remove this document from the intake.")} variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2 -mt-2" onClick={() => removeDoc(doc.id)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))}
          {data.documents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No documents added.</p>
              <p className="text-sm">You can skip this if you don't have any.</p>
            </div>
          )}
        </div>
        </>
      ),
    });
  }

  if (data.stage === 7) {
    return Layout({
      title: pcText.stages[6],
      desc: pcText.stageDescriptions[6],
      disableNext: SAFETY_QUESTIONS.some(q => !data.safety[q.id]),
      children: (
        <>
        <div className="space-y-8">
          {SAFETY_QUESTIONS.map(q => (
            <div key={q.id} className="bg-card border rounded-xl p-5 shadow-sm" data-sr-description={tr("Choose No, Not sure, or Yes for this emergency safety question.")}>
              <Label className="text-lg font-medium block mb-4 leading-relaxed">{q.text}</Label>
              <TapChoice 
                value={data.safety[q.id] || ""} 
                options={["No", "Not sure", "Yes"]}
                description="Choose No, Not sure, or Yes for this emergency safety question."
                translate={tr}
                onChange={v => handleSafetyChange(q.id, v)} 
              />
            </div>
          ))}
        </div>
        </>
      ),
    });
  }

  if (data.stage === 8) {
    return Layout({
      title: pcText.stages[7],
      desc: pcText.stageDescriptions[7],
      onNext: nextStage,
      nextLabel: "Continue to Summary",
      children: (
        <>
        <div className="space-y-6">
          {submissionError && (
            <Alert variant="destructive" role="alert">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{submissionError}</AlertDescription>
            </Alert>
          )}
          <Card className="shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/30 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Chief Complaint & HPI</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => updateData(p => ({...p, stage: 2}))}><Edit2 className="h-4 w-4 mr-2"/> Edit</Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div><span className="font-semibold text-muted-foreground">Problem:</span> <span className="font-medium text-foreground">{data.mainProblem.complaint}</span></div>
              <div><span className="font-semibold text-muted-foreground">Onset:</span> {data.mainProblem.onset}</div>
              <div><span className="font-semibold text-muted-foreground">Severity:</span> {data.mainProblem.severity}</div>
              {Object.entries(data.hpi.answers).map(([q, a]) => (
                <div key={q} className="pt-2 border-t"><p className="font-semibold text-muted-foreground mb-1">{q}</p><p className="font-medium text-foreground">{a || "Not provided"}</p></div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/30 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Medical History & AYUSH</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => updateData(p => ({...p, stage: 3}))}><Edit2 className="h-4 w-4 mr-2"/> Edit</Button>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold text-muted-foreground">Conditions:</span> {data.medicalHistory.conditions || "None"}</div>
              <div><span className="font-semibold text-muted-foreground">Medications:</span> {data.medicalHistory.medications || "None"}</div>
              <div><span className="font-semibold text-muted-foreground">Allergies:</span> {data.medicalHistory.allergies || "None"}</div>
              <div><span className="font-semibold text-muted-foreground">Diet/Appetite:</span> {data.ayush.appetite || "Not provided"}</div>
              <div><span className="font-semibold text-muted-foreground">Sleep:</span> {data.ayush.sleep || "Not provided"}</div>
              <div><span className="font-semibold text-muted-foreground">Prakriti:</span> {data.ayush.prakriti || "Not provided"}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/30 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{tr("Documents")} ({data.documents.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => updateData(p => ({...p, stage: 6}))}><Edit2 className="h-4 w-4 mr-2"/> Edit</Button>
            </CardHeader>
          </Card>
        </div>
        </>
      ),
    });
  }

  if (data.stage === 9) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <LanguagePicker id="intake-language-summary" />
        <div><h1 className="text-3xl font-bold">{pcText.summaryTitle}</h1><p className="mt-2 text-muted-foreground">{pcText.summaryDescription}</p></div>
        {sentConsultationId && <Alert className="border-green-300 bg-green-50"><Check className="h-4 w-4 text-green-700"/><AlertTitle>Sent for clinic review</AlertTitle><AlertDescription>Submission #{sentConsultationId} is saved in your health history and is awaiting clinician review.</AlertDescription></Alert>}
        {submissionError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertDescription>{submissionError}</AlertDescription></Alert>}
        <Card id="pre-consultation-summary" data-testid="card-pre-consultation-case-sheet" className="overflow-hidden rounded-md border-slate-300 bg-white text-slate-950 shadow-sm">
          <header className="border-t-[6px] border-t-teal-700 border-b border-slate-300 bg-slate-50 px-4 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Sushruth clinical intake</p>
                <h2 className="mt-1 font-serif text-2xl font-bold uppercase tracking-tight text-slate-950">Pre-Consultation Case Sheet</h2>
                <p className="mt-1 text-xs text-slate-500">{pcText.patientDetails} · {new Date().toLocaleDateString()}</p>
              </div>
              <Badge className="w-fit border border-amber-300 bg-amber-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 hover:bg-amber-100">
                {pendingVerification}
              </Badge>
            </div>
          </header>
          <CardContent className="p-0">
            {caseSheetSections.map(section => (
              <section
                key={section.number}
                data-testid={`section-case-sheet-${section.number}`}
                className={`border-b border-slate-300 last:border-b-0 ${
                  section.tone === "alert" ? "bg-red-50/70" : section.tone === "ayush" ? "bg-teal-50/50" : "bg-white"
                }`}
              >
                <div className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white sm:px-5 ${
                  section.tone === "alert" ? "bg-red-800" : section.tone === "ayush" ? "bg-teal-800" : "bg-slate-800"
                }`}>
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/95 text-[11px] text-slate-800">{section.number}</span>
                  {section.title}
                </div>
                <dl className="divide-y divide-slate-200">
                  {section.rows.map((row, rowIndex) => (
                    <div key={`${section.number}-${row.label}-${rowIndex}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(180px,30%)_1fr] sm:gap-5 sm:px-5">
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{row.label}</dt>
                      <dd className="min-w-0 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-900">
                        {row.value}
                        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {row.source || "Patient-reported"} · {pendingVerification}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <footer className="border-t border-slate-300 bg-slate-100 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
              {pcText.clinicalDisclaimer}
            </footer>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="button-save-case-sheet-png" variant="outline" onClick={downloadSummaryPng}><ImageDown className="mr-2 h-4 w-4"/>{pcText.savePng}</Button>
          <Button data-testid="button-save-case-sheet-pdf" variant="outline" onClick={printSummaryPdf}><Download className="mr-2 h-4 w-4"/>{pcText.savePdf}</Button>
          <Link href="/health-records"><Button variant="outline">{pcText.openRecords}</Button></Link>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5"/>{pcText.chooseDoctor}</CardTitle><CardDescription>{pcText.chooseDoctorDescription}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="doctor-search-name">{tr("Doctor name")}</Label>
                <Input
                  id="doctor-search-name"
                  value={doctorSearch.name}
                  placeholder={tr("Enter doctor name")}
                  onChange={(event) => setDoctorSearch(current => ({ ...current, name: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === "Enter") searchDoctors(); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor-search-hospital">{tr("Hospital or clinic")}</Label>
                <Input
                  id="doctor-search-hospital"
                  value={doctorSearch.hospital}
                  placeholder={tr("Enter hospital or clinic")}
                  onChange={(event) => setDoctorSearch(current => ({ ...current, hospital: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === "Enter") searchDoctors(); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor-search-city">{tr("City or location")}</Label>
                <Input
                  id="doctor-search-city"
                  value={doctorSearch.city}
                  placeholder={tr("Enter city or location")}
                  onChange={(event) => setDoctorSearch(current => ({ ...current, city: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === "Enter") searchDoctors(); }}
                />
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={searchDoctors}>
              <Search className="mr-2 h-4 w-4" />
              {tr("Search on Google Maps")}
            </Button>

            {doctorSearchPerformed && selectedDoctorMapQuery && (
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="font-semibold">{tr("Google Maps results")}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{selectedDoctorMapQuery}</p>
                </div>
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertTitle>{tr("Confirm the destination")}</AlertTitle>
                  <AlertDescription>{tr("These are live Google Maps search results. Check the doctor's name, clinic, address, and city carefully before confirming.")}</AlertDescription>
                </Alert>
                <div className="overflow-hidden rounded-lg border bg-background">
                  <iframe
                    title={`${selectedDoctorMapQuery} — Google Maps search results`}
                    src={selectedDoctorMapEmbedUrl}
                    className="h-72 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <Button asChild type="button" variant="outline">
                  <a href={selectedDoctorMapUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {tr("View this location in Google Maps")}
                  </a>
                </Button>
                <Button
                  type="button"
                  variant={doctorSearchConfirmed ? "secondary" : "default"}
                  onClick={() => {
                    setDoctorSearchConfirmed(true);
                    setSubmissionError("");
                  }}
                  className="w-full sm:w-auto"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {doctorSearchConfirmed ? tr("Google result confirmed") : tr("Confirm this Google result")}
                </Button>
              </div>
            )}
            <Button className="w-full" size="lg" onClick={handleSubmitFinal} disabled={!doctorSearchConfirmed || createPreConsultation.isPending || !!sentConsultationId}><Send className="mr-2 h-4 w-4"/>{createPreConsultation.isPending ? "…" : sentConsultationId ? "✓" : pcText.sendSummary}</Button>
            <Link href="/appointments"><Button variant="outline" className="w-full">{pcText.bookAppointment}</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
