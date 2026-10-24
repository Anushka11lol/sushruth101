import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  FileText,
  Heart,
  ShieldCheck,
  Info,
  Siren,
} from "lucide-react";

const PRIVACY_POINTS = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    body: "All health data is encrypted in transit (TLS 1.3) and at rest using AES-256. Your data is never stored in plain text.",
  },
  {
    icon: Eye,
    title: "You Control Your Data",
    body: "You can view, edit, or delete every piece of health data you've entered. We never share your data with third parties without explicit consent.",
  },
  {
    icon: FileText,
    title: "No Data Selling",
    body: "Sushruth does not sell, rent, or monetise your health records. Your data is used solely to power your personalised healthcare experience.",
  },
  {
    icon: Heart,
    title: "Not a Diagnostic Tool",
    body: "Sushruth triages symptoms and recommends specialists — it does not diagnose diseases. Always consult a qualified medical professional for diagnosis and treatment.",
  },
  {
    icon: ShieldCheck,
    title: "Minimal Data Collection",
    body: "We collect only what is necessary to provide the service. AI triage inputs are processed in real-time and not used to train third-party models.",
  },
  {
    icon: Users,
    title: "Family Access Transparency",
    body: "The Care Circle feature lets you control exactly which family members can view your health alerts. No contact sees your data without your permission.",
  },
];

const HOW_WE_ARE_DIFFERENT = [
  "Built exclusively for India — supports Indian languages, Indian specialists, and Indian healthcare workflows.",
  "AI triages symptoms and recommends the right specialist, without overstepping into diagnosis.",
  "Emergency alerts are consent-first and share location only when you activate them.",
  "Open about limitations — we clearly label AI-generated content and always recommend consulting a doctor.",
  "No advertisement-driven business model — your health data is never used for targeted ads.",
];

export default function PrivacyEmergencyPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacy & Emergency Help</h1>
        <p className="text-muted-foreground mt-1">
          How we protect your data and help you alert trusted people in an emergency.
        </p>
      </div>

      <Tabs defaultValue="privacy">
        <TabsList className="w-full">
          <TabsTrigger value="privacy" className="flex-1 gap-2" data-sr-description="Privacy and data — opens health-data protection and sharing settings.">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Privacy & Data
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex-1 gap-2" data-sr-description="Emergency help — alert your connected Care Circle.">
            <Siren className="h-4 w-4" aria-hidden="true" />
            Emergency Help
          </TabsTrigger>
        </TabsList>

        {/* ── PRIVACY TAB ── */}
        <TabsContent value="privacy" className="space-y-5 mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                How We Protect Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PRIVACY_POINTS.map((p) => (
                <div key={p.title} className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0 mt-0.5">
                    <p.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
                What Makes Sushruth Different
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3" role="list">
                {HOW_WE_ARE_DIFFERENT.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <AlertDescription className="text-blue-800 text-xs">
              Sushruth is not a licensed medical provider. All AI outputs are informational only.
              For emergencies, call <strong>108</strong> (India Emergency) or visit the nearest hospital.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="emergency" className="mt-5">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg font-semibold" data-testid="text-emergency-under-development">
                Feature under development
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
