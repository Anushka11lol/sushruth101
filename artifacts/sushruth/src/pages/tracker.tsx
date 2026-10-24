import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTrackerEntries,
  useCreateTrackerEntry,
  useGetTrackerInsights,
  getListTrackerEntriesQueryKey,
  getGetTrackerInsightsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  Plus,
  Droplets,
  Moon,
  Brain,
  Dumbbell,
  Smile,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

const MOOD_OPTIONS = ["Great", "Good", "Okay", "Low", "Stressed", "Unwell"];

const RISK_CONFIG: Record<string, { class: string; icon: React.ElementType; label: string }> = {
  low: { class: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2, label: "Low Risk" },
  moderate: { class: "bg-amber-100 text-amber-800 border-amber-300", icon: AlertTriangle, label: "Moderate Risk" },
  high: { class: "bg-red-100 text-red-800 border-red-300", icon: AlertTriangle, label: "High Risk" },
};

export default function TrackerPage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: today,
    hydration: "",
    sleepHours: "",
    activityMinutes: "",
    symptoms: "",
    mood: "",
  });

  const { data: entries, isLoading } = useListTrackerEntries(
    { userId, days: 14 }, { query: { enabled: !!userId } as any },
  );
  const { data: insights, isLoading: insightsLoading } = useGetTrackerInsights(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const createEntry = useCreateTrackerEntry();

  const handleSubmit = async () => {
    if (!userId) return;
    await createEntry.mutateAsync({
      data: {
        userId,
        date: formData.date,
        hydration: formData.hydration ? Number(formData.hydration) : undefined,
        sleepHours: formData.sleepHours ? Number(formData.sleepHours) : undefined,
        activityMinutes: formData.activityMinutes ? Number(formData.activityMinutes) : undefined,
        symptoms: formData.symptoms || undefined,
        mood: formData.mood || undefined,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListTrackerEntriesQueryKey({ userId }) });
    queryClient.invalidateQueries({ queryKey: getGetTrackerInsightsQueryKey({ userId }) });
    setShowForm(false);
    setFormData({ date: today, hydration: "", sleepHours: "", activityMinutes: "", symptoms: "", mood: "" });
  };

  const riskCfg = insights ? RISK_CONFIG[insights.riskLevel] ?? RISK_CONFIG.low : null;
  const RiskIcon = riskCfg?.icon;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Health Tracker</h1>
          <p className="text-muted-foreground mt-1">Log your daily health habits and get AI-driven insights.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Today
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Daily Health Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Date</Label>
              <Input type="date" className="mt-1 w-40" value={formData.date} max={today} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Water (litres)
                </Label>
                <Input type="number" min="0" max="10" step="0.5" className="mt-1" placeholder="2.5" value={formData.hydration} onChange={(e) => setFormData((p) => ({ ...p, hydration: e.target.value }))} />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  Sleep (hours)
                </Label>
                <Input type="number" min="0" max="24" step="0.5" className="mt-1" placeholder="7.5" value={formData.sleepHours} onChange={(e) => setFormData((p) => ({ ...p, sleepHours: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-green-500" />
                  Activity (minutes)
                </Label>
                <Input type="number" min="0" className="mt-1" placeholder="30" value={formData.activityMinutes} onChange={(e) => setFormData((p) => ({ ...p, activityMinutes: e.target.value }))} />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Smile className="h-4 w-4 text-amber-500" />
                  Mood
                </Label>
                <Select value={formData.mood} onValueChange={(v) => setFormData((p) => ({ ...p, mood: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="How do you feel?" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOOD_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Any Symptoms Today?</Label>
              <Textarea className="mt-1" placeholder="Headache, fatigue, mild cough..." value={formData.symptoms} onChange={(e) => setFormData((p) => ({ ...p, symptoms: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createEntry.isPending}>
                {createEntry.isPending ? "Saving..." : "Save Log"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {insightsLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : insights ? (
        <Card className={`border-2 ${riskCfg?.class?.replace("text-", "border-").replace("-800", "-300") ?? ""}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">AI Health Insights</CardTitle>
              {riskCfg && RiskIcon && (
                <Badge variant="outline" className={`ml-auto text-xs ${riskCfg.class}`}>
                  <RiskIcon className="h-3 w-3 mr-1" />
                  {riskCfg.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground leading-relaxed">{insights.insights}</p>

            <div className="grid grid-cols-3 gap-3">
              {insights.weeklyAvgSleep !== null && insights.weeklyAvgSleep !== undefined && (
                <div className="rounded-lg bg-indigo-50 p-3 text-center">
                  <Moon className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-indigo-700">{insights.weeklyAvgSleep}h</p>
                  <p className="text-xs text-muted-foreground">Avg Sleep</p>
                </div>
              )}
              {insights.weeklyAvgHydration !== null && insights.weeklyAvgHydration !== undefined && (
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <Droplets className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-700">{insights.weeklyAvgHydration}L</p>
                  <p className="text-xs text-muted-foreground">Avg Water</p>
                </div>
              )}
              {insights.weeklyAvgStress !== null && insights.weeklyAvgStress !== undefined && (
                <div className="rounded-lg bg-purple-50 p-3 text-center">
                  <Brain className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-purple-700">{insights.weeklyAvgStress}/10</p>
                  <p className="text-xs text-muted-foreground">Avg Stress</p>
                </div>
              )}
            </div>

            {insights.tips && insights.tips.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preventive Tips</p>
                <ul className="space-y-2">
                  {insights.tips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No entries yet. Start tracking today!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      {new Date(e.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    {e.mood && (
                      <Badge variant="secondary" className="text-xs">{e.mood}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {e.sleepHours != null && (
                      <span className="flex items-center gap-1">
                        <Moon className="h-3 w-3 text-indigo-500" />
                        {e.sleepHours}h sleep
                      </span>
                    )}
                    {e.hydration != null && (
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3 text-blue-500" />
                        {e.hydration}L water
                      </span>
                    )}
                    {e.stressLevel != null && (
                      <span className="flex items-center gap-1">
                        <Brain className="h-3 w-3 text-purple-500" />
                        Stress {e.stressLevel}/10
                      </span>
                    )}
                    {e.activityMinutes != null && (
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3 text-green-500" />
                        {e.activityMinutes}min activity
                      </span>
                    )}
                  </div>
                  {e.symptoms && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{e.symptoms}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
