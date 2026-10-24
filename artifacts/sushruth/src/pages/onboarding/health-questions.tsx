import { useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { HeartPulse, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

const AGE_GROUPS = ["Under 18", "18–30", "31–45", "46–60", "61–75", "76+"];
const CONDITIONS = [
  "Diabetes", "Hypertension", "Heart disease", "Asthma / COPD",
  "Thyroid disorder", "Kidney disease", "Cancer", "None of the above",
];

const STEPS = [
  {
    id: "age",
    question: "What is your age group?",
    subtitle: "",
    multi: false,
    options: AGE_GROUPS.map((a) => ({ value: a, label: a })),
  },
  {
    id: "conditions",
    question: "Any known health conditions?",
    subtitle: "Select all that apply",
    multi: true,
    options: CONDITIONS.map((c) => ({ value: c, label: c })),
  },
  {
    id: "feeling",
    question: "How are you feeling today?",
    subtitle: "",
    multi: false,
    options: [
      { value: "great", label: "😊 Great" },
      { value: "okay", label: "🙂 Okay" },
      { value: "low", label: "😔 Low" },
      { value: "stressed", label: "😣 Stressed" },
      { value: "exhausted", label: "😴 Exhausted" },
    ],
  },
  {
    id: "sleep",
    question: "How many hours did you sleep last night?",
    subtitle: "",
    multi: false,
    options: [
      { value: "lt4", label: "Less than 4" },
      { value: "4to6", label: "4–6 hours" },
      { value: "6to8", label: "6–8 hours" },
      { value: "gt8", label: "More than 8 hours" },
    ],
  },
  {
    id: "stress",
    question: "How stressed have you been lately?",
    subtitle: "",
    multi: false,
    options: [
      { value: "rarely", label: "Rarely stressed" },
      { value: "sometimes", label: "Sometimes stressed" },
      { value: "often", label: "Often stressed" },
      { value: "overwhelmed", label: "Constantly overwhelmed" },
    ],
  },
  {
    id: "energy",
    question: "How would you rate your energy level today?",
    subtitle: "",
    multi: false,
    options: [
      { value: "very_energetic", label: "Very energetic" },
      { value: "normal", label: "Normal" },
      { value: "low", label: "Low" },
      { value: "drained", label: "Completely drained" },
    ],
  },
  {
    id: "eating",
    question: "How healthy was your eating today?",
    subtitle: "",
    multi: false,
    options: [
      { value: "very_healthy", label: "Very healthy" },
      { value: "mostly_balanced", label: "Mostly balanced" },
      { value: "mostly_junk", label: "Mostly junk food" },
      { value: "skipped", label: "Skipped meals" },
    ],
  },
  {
    id: "exercise",
    question: "How often do you exercise or stay physically active?",
    subtitle: "",
    multi: false,
    options: [
      { value: "daily", label: "Daily" },
      { value: "few_times", label: "Few times a week" },
      { value: "rarely", label: "Rarely" },
      { value: "never", label: "Never" },
    ],
  },
  {
    id: "mental",
    question: "What affects your mental wellbeing the most currently?",
    subtitle: "Select all that apply",
    multi: true,
    options: [
      { value: "studies_work", label: "Studies / Work" },
      { value: "relationships", label: "Relationships" },
      { value: "family_pressure", label: "Family pressure" },
      { value: "health_issues", label: "Health issues" },
      { value: "overthinking", label: "Overthinking / Loneliness" },
    ],
  },
  {
    id: "goal",
    question: "What is your main health goal right now?",
    subtitle: "",
    multi: false,
    options: [
      { value: "better_fitness", label: "Better fitness" },
      { value: "better_sleep", label: "Better sleep" },
      { value: "less_stress", label: "Less stress" },
      { value: "mental_health", label: "Better mental health" },
      { value: "weight_management", label: "Weight management" },
      { value: "healthier_lifestyle", label: "Healthier lifestyle overall" },
    ],
  },
] as const;

type Answers = Record<string, string | string[]>;

function isStepAnswered(step: (typeof STEPS)[number], answers: Answers): boolean {
  const val = answers[step.id];
  if (!val) return false;
  if (Array.isArray(val)) return val.length > 0;
  return val.length > 0;
}

export default function HealthQuestionsPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const [, navigate] = useLocation();
  const userId = user?.id ?? "";
  const firstName = user?.firstName ?? "";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;

  const select = (value: string) => {
    if (currentStep.multi) {
      const prev = (answers[currentStep.id] as string[] | undefined) ?? [];
      if (value === "None of the above") {
        setAnswers((a) => ({ ...a, [currentStep.id]: ["None of the above"] }));
        return;
      }
      const withoutNone = prev.filter((x) => x !== "None of the above");
      const next = withoutNone.includes(value)
        ? withoutNone.filter((x) => x !== value)
        : [...withoutNone, value];
      setAnswers((a) => ({ ...a, [currentStep.id]: next }));
    } else {
      setAnswers((a) => ({ ...a, [currentStep.id]: value }));
    }
  };

  const isSelected = (value: string) => {
    const val = answers[currentStep.id];
    if (!val) return false;
    if (Array.isArray(val)) return val.includes(value);
    return val === value;
  };

  const canAdvance = isStepAnswered(currentStep, answers);
  const isLastStep = step === totalSteps - 1;

  const handleNext = async () => {
    if (!canAdvance) return;
    if (isLastStep) {
      if (!userId) return;
      setIsSubmitting(true);
      localStorage.setItem(`sushruth_hq_done_${userId}`, "1");
      localStorage.setItem(`sushruth_hq_age_${userId}`, answers["age"] as string ?? "");
      localStorage.setItem(`sushruth_hq_goal_${userId}`, answers["goal"] as string ?? "");
      localStorage.setItem(`sushruth_hq_all_${userId}`, JSON.stringify(answers));
      localStorage.removeItem(`sushruth_hq_analysis_${userId}`);

      try {
        const res = await fetch("/api/health-records/analyze-questionnaire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, firstName: firstName || undefined, language: language.aiName }),
        });
        if (res.ok) {
          const analysis = await res.json();
          localStorage.setItem(`sushruth_hq_analysis_${userId}`, JSON.stringify(analysis));
        }
      } catch {
      } finally {
        setIsSubmitting(false);
        navigate("/onboarding/language");
      }
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const progress = Math.round(((step + 1) / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex flex-col items-center justify-start px-4 py-10 overflow-y-auto">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2 justify-center">
          <HeartPulse className="h-7 w-7 text-teal-600" aria-hidden="true" />
          <span className="text-xl font-bold text-teal-700">Sushruth</span>
        </div>

        {step === 0 && (
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">
              {greeting}{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-muted-foreground text-sm">
              Let's personalise your health experience. This takes about a minute.
            </p>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Question {step + 1} of {totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-teal-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-border p-6 space-y-4">
          <div>
            <p className="text-base font-semibold text-foreground leading-snug">
              {currentStep.question}
            </p>
            {currentStep.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{currentStep.subtitle}</p>
            )}
          </div>

          <div
            className={cn(
              "grid gap-2",
              currentStep.options.length <= 4 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {currentStep.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => select(opt.value)}
                className={cn(
                  "rounded-xl border-2 py-3 px-4 text-sm font-medium text-left transition-all focus:outline-none focus:ring-2 focus:ring-teal-500",
                  isSelected(opt.value)
                    ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                    : "border-border bg-background text-foreground hover:border-teal-300 hover:bg-teal-50/50",
                )}
                aria-pressed={isSelected(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={handleBack} disabled={isSubmitting}>
              <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              Back
            </Button>
          )}
          <Button
            className={cn("flex-1 text-sm py-5", step === 0 ? "w-full" : "")}
            disabled={!canAdvance || isSubmitting}
            onClick={handleNext}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                Analysing…
              </>
            ) : isLastStep ? (
              <>
                Get started
                <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Your answers personalise your experience and are stored only on your device.
        </p>
      </div>
    </div>
  );
}
