import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/ui/language-selector";
import {
  Stethoscope,
  FileText,
  Calendar,
  HeartPulse,
  Activity,
  Users,
  Pill,
  Mic,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Stethoscope,
    title: "AI Symptom Triage",
    description:
      "Describe your symptoms in any language. Get urgency assessment and specialist recommendations instantly.",
    badge: "Voice Enabled",
    color: "bg-teal-50 text-teal-700",
  },
  {
    icon: FileText,
    title: "Report Simplification",
    description:
      "Upload blood reports, scans, or prescriptions. Get a plain-language explanation with highlighted abnormal values.",
    badge: "OCR Ready",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: Calendar,
    title: "Doctor Appointments",
    description:
      "Browse verified doctors by specialty and city. Book appointments linked directly to your triage session.",
    badge: "Pan-India",
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    icon: HeartPulse,
    title: "Health Records",
    description:
      "Maintain a complete medical profile — blood group, allergies, surgeries, and chronic conditions — all in one place.",
    badge: "Secure",
    color: "bg-rose-50 text-rose-700",
  },
  {
    icon: Activity,
    title: "Preventive Tracker",
    description:
      "Log sleep, hydration, stress, and activity daily. Get AI-powered health insights and preventive tips.",
    badge: "AI Insights",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: Users,
    title: "Care Circle",
    description:
      "Monitor your family's health. Get alerts when a loved one misses their medication or shows high-risk signs.",
    badge: "Family Care",
    color: "bg-green-50 text-green-700",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <HeartPulse className="h-6 w-6" />
            Sushruth
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector className="hidden sm:flex mr-2" buttonClassName="h-9" />
            <Link href="/portal?mode=signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/portal?mode=signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-28 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/30">
            AI-Powered Healthcare for India
          </Badge>
          <div className="sm:hidden mb-6 flex justify-center w-full">
            <LanguageSelector className="w-[220px]" buttonClassName="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Your Personal
            <br />
            Health Companion
          </h1>
          <p className="text-lg md:text-xl text-teal-100 max-w-2xl mx-auto mb-8">
            Sushruth helps you understand your symptoms, simplify medical reports, find the right
            doctor, and track your health — all in one trusted platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/portal?mode=signup">
              <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 font-semibold px-8">
                Start for Free
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/portal?mode=signin">
              <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-teal-200">
            Supports all 22 scheduled Indian languages plus English
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need, in one place
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From triage to treatment, Sushruth guides you through every step of your healthcare
            journey.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex rounded-lg p-2.5 mb-4 ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {f.badge}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">22+</div>
              <div className="text-muted-foreground">Languages Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-muted-foreground">Private & Secure</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">AI Health Guidance</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 p-8 md:p-12 text-white text-center">
          <ShieldCheck className="h-10 w-10 mx-auto mb-4 text-teal-200" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Not a replacement for your doctor
          </h2>
          <p className="text-teal-100 max-w-xl mx-auto mb-6">
            Sushruth provides guidance and triage support only. All AI responses carry a clear
            disclaimer. Always consult a certified doctor for diagnosis and treatment.
          </p>
          <Link href="/portal?mode=signup">
            <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 font-semibold">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border text-center py-6 text-sm text-muted-foreground">
        <p>
          Sushruth &mdash; AI Healthcare Assistant &mdash; For guidance only. Not a substitute for
          medical advice.
        </p>
      </footer>
    </div>
  );
}
