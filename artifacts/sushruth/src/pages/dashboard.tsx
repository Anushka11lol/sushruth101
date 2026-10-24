import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { useListTriageSessions } from "@workspace/api-client-react";
import { useListAppointments } from "@workspace/api-client-react";
import { useListMedications } from "@workspace/api-client-react";
import { useListCareCircleAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope,
  Calendar,
  Pill,
  Bell,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useDisplayName } from "@/hooks/useDisplayName";

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  emergency: "bg-red-100 text-red-800 border-red-200",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "border-l-blue-400",
  warning: "border-l-amber-400",
  critical: "border-l-red-500",
};

export default function Dashboard() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const t = useTranslation();
  const { firstName: displayFirst } = useDisplayName();

  const { data: triageSessions, isLoading: triageLoading } = useListTriageSessions(
    { userId },
    { query: { enabled: !!userId } as any },
  );
  const { data: appointments, isLoading: apptLoading } = useListAppointments(
    { userId },
    { query: { enabled: !!userId } as any },
  );
  const { data: medications, isLoading: medsLoading } = useListMedications(
    { userId },
    { query: { enabled: !!userId } as any },
  );
  const { data: alerts, isLoading: alertsLoading } = useListCareCircleAlerts(
    { userId },
    { query: { enabled: !!userId } as any },
  );

  const recentSessions = triageSessions?.slice(0, 3) ?? [];
  const upcomingAppts = appointments
    ?.filter((a) => a.status === "scheduled" && new Date(a.scheduledAt) > new Date())
    .slice(0, 3) ?? [];
  const activeMeds = medications?.filter((m) => m.isActive).slice(0, 4) ?? [];
  const unreadAlerts = alerts?.filter((a) => !a.isRead).slice(0, 3) ?? [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.good_morning : hour < 17 ? t.good_afternoon : t.good_evening;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {displayFirst || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "there"}
        </h1>
        <p className="text-muted-foreground mt-1">{t.health_summary_today}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{triageSessions?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t.triage_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingAppts.length}</p>
                <p className="text-xs text-muted-foreground">{t.upcoming_appts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-700">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeMeds.length}</p>
                <p className="text-xs text-muted-foreground">{t.active_meds}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadAlerts.length}</p>
                <p className="text-xs text-muted-foreground">{t.care_alerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">{t.recent_triage_sessions}</CardTitle>
            <Link href="/triage">
              <Button variant="ghost" size="sm" className="text-xs">
                {t.new_triage} <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {triageLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="text-center py-6">
                <Stethoscope className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t.no_triage_yet}</p>
                <Link href="/triage">
                  <Button size="sm" className="mt-3">{t.start_triage}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((s) => (
                  <div key={s.id} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 mt-0.5 ${URGENCY_COLORS[s.urgencyLevel] ?? ""}`}
                    >
                      {s.urgencyLevel}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.symptoms}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.specialistRecommended} &middot;{" "}
                        {new Date(s.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">{t.upcoming_appointments}</CardTitle>
            <Link href="/appointments">
              <Button variant="ghost" size="sm" className="text-xs">
                {t.view_all} <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {apptLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : upcomingAppts.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t.no_upcoming_appts}</p>
                <Link href="/appointments">
                  <Button size="sm" className="mt-3">{t.book_appointment}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppts.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {(a as any).doctor?.name ?? "Doctor"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(a as any).doctor?.specialty ?? ""} &middot;{" "}
                        {new Date(a.scheduledAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">{t.todays_medications}</CardTitle>
            <Link href="/medications">
              <Button variant="ghost" size="sm" className="text-xs">
                {t.view_all} <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {medsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activeMeds.length === 0 ? (
              <div className="text-center py-6">
                <Pill className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t.no_active_meds}</p>
                <Link href="/medications">
                  <Button size="sm" className="mt-3">{t.add_medication}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {activeMeds.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
                    <Pill className="h-4 w-4 text-purple-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.dosage} &middot; {m.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">{t.care_circle_alerts}</CardTitle>
            <Link href="/care-circle">
              <Button variant="ghost" size="sm" className="text-xs">
                {t.view_all} <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : unreadAlerts.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">{t.all_clear_alerts}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unreadAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={`border-l-4 rounded-r-lg bg-muted/50 p-3 ${SEVERITY_COLORS[a.severity] ?? "border-l-gray-300"}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <p className="text-xs font-medium text-foreground">{a.memberName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
