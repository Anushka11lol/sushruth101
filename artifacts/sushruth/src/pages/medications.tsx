import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMedications,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
  useMarkMedicationTaken,
  useListMedicationLogs,
  getListMedicationsQueryKey,
  getListMedicationLogsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  CheckCheck,
  Bell,
  BellOff,
} from "lucide-react";
import { useMedicationReminders } from "@/hooks/useMedicationReminders";

const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Every 4 hours", "Every 6 hours", "Every 8 hours", "Weekly", "As needed"];

const REMINDERS_KEY = "sushruth_medication_reminders_enabled";

export default function MedicationsPage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [showForm, setShowForm] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    return localStorage.getItem(REMINDERS_KEY) === "true";
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported",
  );
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    timings: "",
    startDate: today,
    endDate: "",
    prescribedBy: "",
    notes: "",
  });

  const { data: medications, isLoading } = useListMedications(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const { data: logs, isLoading: logsLoading } = useListMedicationLogs(
    { userId, days: 7 }, { query: { enabled: !!userId } as any },
  );
  const createMedication = useCreateMedication();
  const deleteMedication = useDeleteMedication();
  const markTaken = useMarkMedicationTaken();

  const activeMeds = medications?.filter((m) => m.isActive) ?? [];
  const inactiveMeds = medications?.filter((m) => !m.isActive) ?? [];

  const todayLogs = logs?.filter((l) => {
    const logDate = new Date(l.takenAt).toISOString().slice(0, 10);
    return logDate === today;
  }) ?? [];
  const takenMedIds = new Set(todayLogs.map((l) => l.medicationId));

  const { requestPermission } = useMedicationReminders(
    medications ?? [],
    remindersEnabled && notifPermission === "granted",
  );

  useEffect(() => {
    localStorage.setItem(REMINDERS_KEY, remindersEnabled ? "true" : "false");
  }, [remindersEnabled]);

  const handleToggleReminders = async () => {
    if (!remindersEnabled) {
      if (notifPermission === "unsupported") {
        alert("Browser notifications are not supported in this browser.");
        return;
      }
      if (notifPermission !== "granted") {
        const granted = await requestPermission();
        setNotifPermission(granted ? "granted" : "denied");
        if (!granted) {
          alert("Please allow notifications in your browser settings to enable medication reminders.");
          return;
        }
      }
      setRemindersEnabled(true);
    } else {
      setRemindersEnabled(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.dosage || !formData.frequency || !userId) return;
    await createMedication.mutateAsync({ data: { userId, ...formData } });
    queryClient.invalidateQueries({ queryKey: getListMedicationsQueryKey({ userId }) });
    setShowForm(false);
    setFormData({ name: "", dosage: "", frequency: "", timings: "", startDate: today, endDate: "", prescribedBy: "", notes: "" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this medication?")) return;
    await deleteMedication.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListMedicationsQueryKey({ userId }) });
  };

  const handleMarkTaken = async (id: number) => {
    await markTaken.mutateAsync({
      id,
      data: { takenAt: new Date().toISOString() },
    });
    queryClient.invalidateQueries({ queryKey: getListMedicationLogsQueryKey({ userId }) });
  };

  const MedicationCard = ({ med, showTaken = false }: { med: any; showTaken?: boolean }) => {
    const taken = takenMedIds.has(med.id);
    return (
      <Card className={taken && showTaken ? "opacity-70" : ""} aria-label={`${med.name} ${med.dosage}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-lg p-2 shrink-0 ${taken && showTaken ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}
              aria-hidden="true"
            >
              <Pill className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{med.name}</p>
                  <p className="text-sm text-muted-foreground">{med.dosage} &middot; {med.frequency}</p>
                  {med.timings && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {med.timings}
                    </p>
                  )}
                  {med.prescribedBy && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3" aria-hidden="true" />
                      {med.prescribedBy}
                    </p>
                  )}
                  {med.endDate && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      Until {new Date(med.endDate).toLocaleDateString("en-IN")}
                    </p>
                  )}
                  {med.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{med.notes}</p>
                  )}
                </div>
                {!med.isActive && (
                  <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {showTaken && med.isActive && (
                <Button
                  size="sm"
                  variant={taken ? "secondary" : "default"}
                  className={`text-xs ${taken ? "bg-green-100 text-green-800 hover:bg-green-200 border-green-300" : ""}`}
                  onClick={() => !taken && handleMarkTaken(med.id)}
                  disabled={taken || markTaken.isPending}
                  aria-label={taken ? `${med.name} already taken` : `Mark ${med.name} as taken`}
                >
                  {taken ? (
                    <><CheckCheck className="h-3 w-3 mr-1" aria-hidden="true" />Taken</>
                  ) : (
                    <><CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />Mark Taken</>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleDelete(med.id)}
                aria-label={`Delete ${med.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medications</h1>
          <p className="text-muted-foreground mt-1">Track your medications and log when you take them.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={remindersEnabled ? "default" : "outline"}
            size="sm"
            onClick={handleToggleReminders}
            aria-label={remindersEnabled ? "Disable medication reminders" : "Enable medication reminders"}
            title={remindersEnabled ? "Reminders on — click to disable" : "Enable push notification reminders"}
          >
            {remindersEnabled ? (
              <><Bell className="mr-1.5 h-4 w-4" aria-hidden="true" />Reminders On</>
            ) : (
              <><BellOff className="mr-1.5 h-4 w-4" aria-hidden="true" />Reminders Off</>
            )}
          </Button>
          <Button onClick={() => setShowForm(true)} aria-label="Add new medication">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Medication
          </Button>
        </div>
      </div>

      {remindersEnabled && notifPermission === "granted" && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800 flex items-center gap-2"
        >
          <Bell className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
          Medication reminders are active. You will receive browser notifications at scheduled times.
        </div>
      )}

      <Card className="border-2 border-primary/20 bg-primary/5" aria-label="Today's medication schedule">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Today's Medications
            <Badge variant="secondary" className="ml-auto" aria-label={`${takenMedIds.size} of ${activeMeds.length} taken today`}>
              {takenMedIds.size}/{activeMeds.length} taken
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading medications">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : activeMeds.length === 0 ? (
            <div className="text-center py-6">
              <Pill className="h-8 w-8 mx-auto text-muted-foreground mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No active medications.</p>
              <Button size="sm" className="mt-3" onClick={() => setShowForm(true)}>Add Medication</Button>
            </div>
          ) : (
            <div className="space-y-3" role="list" aria-label="Active medications">
              {activeMeds.map((m) => <MedicationCard key={m.id} med={m} showTaken />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="active">
        <TabsList aria-label="Medication views">
          <TabsTrigger value="active" data-sr-description="Active medicines — shows medicines you currently take.">Active ({activeMeds.length})</TabsTrigger>
          <TabsTrigger value="inactive" data-sr-description="Inactive medicines — shows medicines you no longer take.">Inactive ({inactiveMeds.length})</TabsTrigger>
          <TabsTrigger value="logs" data-sr-description="Medicine logs — shows doses recorded during the last seven days.">Logs (7 days)</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : activeMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active medications.</p>
          ) : (
            activeMeds.map((m) => <MedicationCard key={m.id} med={m} />)
          )}
        </TabsContent>
        <TabsContent value="inactive" className="space-y-3 mt-4">
          {inactiveMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No inactive medications.</p>
          ) : (
            inactiveMeds.map((m) => <MedicationCard key={m.id} med={m} />)
          )}
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          {logsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No medication logs in the last 7 days.</p>
            </div>
          ) : (
            <div className="space-y-2" role="list" aria-label="Medication history">
              {logs.map((log) => {
                const med = medications?.find((m) => m.id === log.medicationId);
                return (
                  <div key={log.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5" role="listitem">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{med?.name ?? "Unknown medication"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.takenAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    {med && (
                      <Badge variant="secondary" className="text-xs shrink-0">{med.dosage}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm} aria-labelledby="add-medication-title">
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle id="add-medication-title">Add Medication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="med-name">Medication Name</Label>
                <Input id="med-name" className="mt-1" placeholder="Metformin" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="med-dosage">Dosage</Label>
                <Input id="med-dosage" className="mt-1" placeholder="500mg" value={formData.dosage} onChange={(e) => setFormData((p) => ({ ...p, dosage: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="med-frequency">Frequency</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData((p) => ({ ...p, frequency: v }))}>
                  <SelectTrigger id="med-frequency" className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="med-timings">Timings</Label>
              <Input id="med-timings" className="mt-1" placeholder="Morning after breakfast, Night after dinner" value={formData.timings} onChange={(e) => setFormData((p) => ({ ...p, timings: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Used for push notification reminders</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="med-start">Start Date</Label>
                <Input id="med-start" className="mt-1" type="date" value={formData.startDate} onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="med-end">End Date (optional)</Label>
                <Input id="med-end" className="mt-1" type="date" value={formData.endDate} onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="med-prescribed">Prescribed By</Label>
              <Input id="med-prescribed" className="mt-1" placeholder="Dr. Sharma" value={formData.prescribedBy} onChange={(e) => setFormData((p) => ({ ...p, prescribedBy: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="med-notes">Notes</Label>
              <Textarea id="med-notes" className="mt-1" placeholder="Take with water, avoid on empty stomach..." value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.dosage || !formData.frequency || createMedication.isPending}>
              {createMedication.isPending ? "Adding..." : "Add Medication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
