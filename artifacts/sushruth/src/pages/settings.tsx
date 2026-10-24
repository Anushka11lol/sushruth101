import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  useGetUserProfile,
  useUpsertUserProfile,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  ExternalLink,
  Lock,
  CheckCircle2,
  Edit3,
  Languages,
  Check,
  ClipboardList,
  RefreshCw,
  Brain,
  Bed,
  Zap,
  Target,
  HeartPulse,
  Lightbulb,
  Copy,
} from "lucide-react";
import { useLanguage, useTranslation, INDIAN_LANGUAGES } from "@/context/LanguageContext";
import { saveDisplayName } from "@/hooks/useDisplayName";
import { cn } from "@/lib/utils";

interface HealthAnalysis {
  summary: string;
  tips: string[];
  highlights: {
    sleep?: string;
    stress?: string;
    energy?: string;
    goal?: string;
  };
  overallScore: number;
  overallLabel: string;
  date: string;
}

const SCORE_COLORS: Record<string, string> = {
  Excellent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Good: "bg-teal-100 text-teal-700 border-teal-200",
  Fair: "bg-amber-100 text-amber-700 border-amber-200",
  "Needs Attention": "bg-red-100 text-red-700 border-red-200",
};

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "yesterday";
  return `${diffD} days ago`;
}

export default function SettingsPage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { language, setLanguageCode } = useLanguage();
  const t = useTranslation();
  const [, navigate] = useLocation();

  const { data: profile, isLoading } = useGetUserProfile(userId, {
    query: { enabled: !!userId, retry: false } as any,
  });

  const upsert = useUpsertUserProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationText, setLocationText] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [sushruthIdCopied, setSushruthIdCopied] = useState(false);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysis | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone ?? "");
      setLocationText(profile.locationText ?? "");
      setCity(profile.city ?? "");
      setState(profile.state ?? "");
      setPincode(profile.pincode ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!userId) return;
    const raw = localStorage.getItem(`sushruth_hq_analysis_${userId}`);
    if (raw) {
      try {
        setHealthAnalysis(JSON.parse(raw));
      } catch {
        setHealthAnalysis(null);
      }
    }
  }, [userId]);

  const handleSaveName = async () => {
    if (!user) return;
    setNameSaving(true);
    try {
      const fn = firstName.trim();
      const ln = lastName.trim();
      await user.update({ firstName: fn, lastName: ln });
      await user.reload();
      saveDisplayName(userId, fn, ln);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch {
      const fn = firstName.trim();
      const ln = lastName.trim();
      saveDisplayName(userId, fn, ln);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } finally {
      setNameSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setProfileSaving(true);
    try {
      await upsert.mutateAsync({
        userId,
        data: {
          phone: phone.trim() || null,
          locationText: locationText.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(userId) });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
    } finally {
      setProfileSaving(false);
    }
  };

  const openLocationOnMaps = () => {
    const query = [locationText, city, state, pincode, "India"].filter(Boolean).join(", ");
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleRetakeQuestionnaire = () => {
    if (!userId) return;
    localStorage.removeItem(`sushruth_hq_done_${userId}`);
    localStorage.removeItem(`sushruth_hq_age_${userId}`);
    localStorage.removeItem(`sushruth_hq_goal_${userId}`);
    localStorage.removeItem(`sushruth_hq_all_${userId}`);
    localStorage.removeItem(`sushruth_hq_analysis_${userId}`);
    setHealthAnalysis(null);
    navigate("/onboarding/health");
  };

  const scoreColorClass =
    healthAnalysis ? (SCORE_COLORS[healthAnalysis.overallLabel] ?? SCORE_COLORS["Fair"]) : "";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.account_settings_title}</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal details and contact information.
        </p>
      </div>

      <Card className="border-teal-200 bg-teal-50/40">
        <CardHeader>
          <CardTitle className="text-base">Sushruth ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-2xl font-bold tracking-wider text-teal-800" data-testid="text-profile-sushruth-id">
              {profile?.sushruthId ?? (isLoading ? "Loading…" : "Unavailable")}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={!profile?.sushruthId}
              data-testid="button-copy-profile-sushruth-id"
              onClick={async () => {
                if (!profile?.sushruthId) return;
                await navigator.clipboard.writeText(profile.sushruthId);
                setSushruthIdCopied(true);
                setTimeout(() => setSushruthIdCopied(false), 2000);
              }}
            >
              {sushruthIdCopied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {sushruthIdCopied ? "Copied" : "Copy Sushruth ID"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Use this permanent public ID for Care Circle requests. It does not grant access to your medical records.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.personal_info}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first-name">{t.first_name}</Label>
              <Input
                id="first-name"
                className="mt-1"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t.first_name}
              />
            </div>
            <div>
              <Label htmlFor="last-name">{t.last_name}</Label>
              <Input
                id="last-name"
                className="mt-1"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t.last_name}
              />
            </div>
          </div>
          <Button
            onClick={handleSaveName}
            disabled={nameSaving || !firstName.trim()}
            size="sm"
            className="gap-2"
          >
            {nameSaved ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {nameSaving ? `${t.save}…` : t.save_name}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.email_address_title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium flex-1">
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </span>
            <Badge variant="secondary" className="text-xs gap-1">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Managed by auth
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Email is managed by your authentication provider and cannot be changed here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.contact_location}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="phone">{t.phone_number}</Label>
                <Input
                  id="phone"
                  className="mt-1"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  type="tel"
                />
              </div>
              <Separator />
              <div>
                <Label htmlFor="location-text" className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.address_landmark}
                </Label>
                <Input
                  id="location-text"
                  className="mt-1"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="Street address or landmark"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="city">{t.city}</Label>
                  <Input
                    id="city"
                    className="mt-1"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <Label htmlFor="state">{t.state_label}</Label>
                  <Input
                    id="state"
                    className="mt-1"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">{t.pincode}</Label>
                  <Input
                    id="pincode"
                    className="mt-1"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="400001"
                    maxLength={6}
                  />
                </div>
              </div>
              {(city || locationText) && (
                <button
                  onClick={openLocationOnMaps}
                  className="text-xs text-primary underline flex items-center gap-1 hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label="View your location on Google Maps"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  View on Google Maps
                </button>
              )}
              <Button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                size="sm"
                className="gap-2"
              >
                {profileSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {profileSaving ? `${t.save}…` : t.save_contact}
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.preferred_language}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.change_language} — the entire app will switch to your chosen language instantly.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INDIAN_LANGUAGES.map((lang) => {
              const isSelected = lang.code === language.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguageCode(lang.code)}
                  className={`relative flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Select ${lang.name}`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2">
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    </span>
                  )}
                  <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {lang.nativeName}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">{lang.name}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
            Health Questionnaire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Retake the onboarding health questionnaire to update your wellness profile — mood, sleep, stress, energy, eating habits, exercise, and health goals.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRetakeQuestionnaire}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retake Health Questionnaire
          </Button>

          {healthAnalysis && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold text-foreground">AI Health Snapshot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-semibold border", scoreColorClass)}
                    >
                      <HeartPulse className="h-3 w-3 mr-1" aria-hidden="true" />
                      {healthAnalysis.overallLabel} · {healthAnalysis.overallScore}/10
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {healthAnalysis.summary}
                </p>

                {Object.keys(healthAnalysis.highlights).length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {healthAnalysis.highlights.sleep && (
                      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                        <Bed className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-medium text-foreground">Sleep</p>
                          <p className="text-xs text-muted-foreground">{healthAnalysis.highlights.sleep}</p>
                        </div>
                      </div>
                    )}
                    {healthAnalysis.highlights.stress && (
                      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                        <Brain className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-medium text-foreground">Stress</p>
                          <p className="text-xs text-muted-foreground">{healthAnalysis.highlights.stress}</p>
                        </div>
                      </div>
                    )}
                    {healthAnalysis.highlights.energy && (
                      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-medium text-foreground">Energy</p>
                          <p className="text-xs text-muted-foreground">{healthAnalysis.highlights.energy}</p>
                        </div>
                      </div>
                    )}
                    {healthAnalysis.highlights.goal && (
                      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                        <Target className="h-3.5 w-3.5 text-teal-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-medium text-foreground">Goal</p>
                          <p className="text-xs text-muted-foreground">{healthAnalysis.highlights.goal}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {healthAnalysis.tips.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                      <p className="text-xs font-semibold text-foreground">Personalised tips for you</p>
                    </div>
                    <ul className="space-y-1.5" aria-label="Health tips">
                      {healthAnalysis.tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                  Generated {formatRelativeDate(healthAnalysis.date)}.
                  Retake the questionnaire to refresh your snapshot.
                </p>
              </div>
            </>
          )}

          {!healthAnalysis && (
            <p className="text-xs text-muted-foreground/70">
              Complete the questionnaire to see your personalised AI health snapshot here.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.profile_summary}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-28 shrink-0">{t.full_name}</span>
              <span className="font-medium">{user?.fullName || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-28 shrink-0">{t.email_address_title}</span>
              <span className="font-medium">{user?.primaryEmailAddress?.emailAddress || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-28 shrink-0">{t.phone_label}</span>
              <span className="font-medium">{phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-28 shrink-0">{t.location_label}</span>
              <span className="font-medium">
                {[city, state, pincode].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-28 shrink-0">{t.preferred_language}</span>
              <span className="font-medium">{language.nativeName} ({language.name})</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
