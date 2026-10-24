import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CareCircleMember,
  useListCareCircleMembers,
  useListCareCircleDuties,
  useCreateCareCircleDuty,
  useDeleteCareCircleDuty,
  useListCareCircleDailyCareLogs,
  useCreateCareCircleDailyCareLog,
  useDeleteCareCircleDailyCareLog,
  getListCareCircleDutiesQueryKey,
  getListCareCircleDailyCareLogsQueryKey,
} from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, CalendarCheck, CheckCircle2, Circle, Clock, Trash2, Plus, Calendar as CalendarIcon } from "lucide-react";

const DUTY_CATEGORIES = ["Medication", "Hygiene", "Nutrition", "Mobility", "Vitals", "Other"];
const FREQUENCIES = ["Daily", "Twice Daily", "Weekly", "As Needed"];
const LOG_STATUSES = ["completed", "skipped", "delayed"];

export function MemberCarePlan({ userId, member }: { userId: string; member: CareCircleMember }) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("logs");
  
  // Dialog states
  const [dutyOpen, setDutyOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dutyForm, setDutyForm] = useState({ title: "", category: "", frequency: "", instructions: "", assignedToMemberId: "none" });
  const [logForm, setLogForm] = useState({ dutyId: "none", category: "", status: "completed", notes: "" });

  const today = new Date().toISOString().split('T')[0];

  const { data: duties, isLoading: dutiesLoading } = useListCareCircleDuties(
    { userId, memberId: member.id },
    { query: { enabled: !!userId && !!member.id } as any }
  );
  const { data: careTeam } = useListCareCircleMembers(
    { userId },
    { query: { enabled: !!userId } as any }
  );
  const assignableMembers = careTeam?.filter(person =>
    person.id !== member.id && ["home_nurse", "caretaker", "family_member"].includes(person.careRole ?? "family_member")
  ) ?? [];

  const { data: logs, isLoading: logsLoading } = useListCareCircleDailyCareLogs(
    { userId, memberId: member.id, careDate: today },
    { query: { enabled: !!userId && !!member.id } as any }
  );

  const createDuty = useCreateCareCircleDuty();
  const deleteDuty = useDeleteCareCircleDuty();
  const createLog = useCreateCareCircleDailyCareLog();
  const deleteLog = useDeleteCareCircleDailyCareLog();

  const handleAddDuty = async () => {
    if (!dutyForm.title || !dutyForm.category || !dutyForm.frequency) return;
    try {
      await createDuty.mutateAsync({
        data: {
          userId,
          memberId: member.id,
          title: dutyForm.title,
          category: dutyForm.category,
          frequency: dutyForm.frequency,
          instructions: dutyForm.instructions || undefined,
          assignedToMemberId: dutyForm.assignedToMemberId === "none" ? undefined : Number(dutyForm.assignedToMemberId),
        }
      });
      queryClient.invalidateQueries({ queryKey: getListCareCircleDutiesQueryKey({ userId, memberId: member.id }) });
      setDutyOpen(false);
      setDutyForm({ title: "", category: "", frequency: "", instructions: "", assignedToMemberId: "none" });
      setFeedback({ type: "success", text: "Care duty added." });
    } catch {
      setFeedback({ type: "error", text: "The care duty could not be added. Please try again." });
    }
  };

  const handleRemoveDuty = async (id: number) => {
    if (!confirm("Remove this duty?")) return;
    try {
      await deleteDuty.mutateAsync({ id, params: { userId } });
      queryClient.invalidateQueries({ queryKey: getListCareCircleDutiesQueryKey({ userId, memberId: member.id }) });
      setFeedback({ type: "success", text: "Care duty removed." });
    } catch {
      setFeedback({ type: "error", text: "The care duty could not be removed." });
    }
  };

  const handleAddLog = async () => {
    if (!logForm.status) return;
    
    let category = logForm.category;
    let dutyId: number | undefined = undefined;
    
    if (logForm.dutyId !== "none") {
      dutyId = parseInt(logForm.dutyId);
      const duty = duties?.find(d => d.id === dutyId);
      if (duty) category = duty.category;
    }

    if (!category) return;

    try {
      await createLog.mutateAsync({
        data: {
          userId,
          memberId: member.id,
          dutyId,
          careDate: today,
          category,
          status: logForm.status,
          notes: logForm.notes || undefined,
          recordedBy: user?.fullName || user?.firstName || "Account owner",
        }
      });
      queryClient.invalidateQueries({ queryKey: getListCareCircleDailyCareLogsQueryKey({ userId, memberId: member.id, careDate: today }) });
      setLogOpen(false);
      setLogForm({ dutyId: "none", category: "", status: "completed", notes: "" });
      setFeedback({ type: "success", text: "Daily care activity recorded." });
    } catch {
      setFeedback({ type: "error", text: "The daily care activity could not be saved." });
    }
  };

  const handleRemoveLog = async (id: number) => {
    if (!confirm("Remove this log?")) return;
    try {
      await deleteLog.mutateAsync({ id, params: { userId } });
      queryClient.invalidateQueries({ queryKey: getListCareCircleDailyCareLogsQueryKey({ userId, memberId: member.id, careDate: today }) });
      setFeedback({ type: "success", text: "Daily care entry removed." });
    } catch {
      setFeedback({ type: "error", text: "The daily care entry could not be removed." });
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div role="status" className={`rounded-lg border px-3 py-2 text-sm ${feedback.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {feedback.text}
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="logs" className="gap-2" data-sr-description="Today's care — shows care activities recorded today.">
              <CalendarCheck className="h-4 w-4" />
              Today's Care
            </TabsTrigger>
            <TabsTrigger value="duties" className="gap-2" data-sr-description="Assigned duties — shows care tasks assigned to this caretaker.">
              <ClipboardList className="h-4 w-4" />
              Assigned Duties
            </TabsTrigger>
          </TabsList>
          
          {activeTab === "logs" ? (
            <Button size="sm" onClick={() => setLogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Log Activity
            </Button>
          ) : (
            <Button size="sm" onClick={() => setDutyOpen(true)} variant="secondary">
              <Plus className="mr-1 h-4 w-4" /> Add Duty
            </Button>
          )}
        </div>

        <TabsContent value="logs" className="mt-0 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b border-border">
            <CalendarIcon className="h-4 w-4" />
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          {!logsLoading && (!logs || logs.length === 0) ? (
            <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
              <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">No care activities logged today</p>
              <p className="text-xs text-muted-foreground mt-1">Keep track of medications, meals, and hygiene.</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setLogOpen(true)}>
                Record First Activity
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {logs?.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                  {log.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  ) : log.status === "delayed" ? (
                    <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {log.dutyId ? duties?.find(d => d.id === log.dutyId)?.title || "Assigned Duty" : "Unplanned Activity"}
                      </p>
                      <Badge variant="secondary" className="text-[10px] uppercase">{log.category}</Badge>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Recorded by {log.recordedBy || "Unknown"} at {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleRemoveLog(log.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="duties" className="mt-0 space-y-3">
          {!dutiesLoading && (!duties || duties.length === 0) ? (
            <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">No duties assigned</p>
              <p className="text-xs text-muted-foreground mt-1">Define routine tasks for caretakers or family members.</p>
            </div>
          ) : (
            duties?.map(duty => (
              <Card key={duty.id}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{duty.title}</h4>
                      <Badge variant="outline" className="text-[10px]">{duty.frequency}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{duty.category}</Badge>
                    </div>
                    {duty.instructions && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                        {duty.instructions}
                      </p>
                    )}
                    {duty.assignedToMemberId && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Assigned to {careTeam?.find(person => person.id === duty.assignedToMemberId)?.memberName ?? "care team member"}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleRemoveDuty(duty.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Duty Form Dialog */}
      <Dialog open={dutyOpen} onOpenChange={setDutyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Care Duty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Title</Label>
              <Input placeholder="e.g. Check Blood Pressure" value={dutyForm.title} onChange={e => setDutyForm(p => ({ ...p, title: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={dutyForm.category} onValueChange={v => setDutyForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DUTY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={dutyForm.frequency} onValueChange={v => setDutyForm(p => ({ ...p, frequency: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={dutyForm.assignedToMemberId} onValueChange={v => setDutyForm(p => ({ ...p, assignedToMemberId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a caretaker" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned / family team</SelectItem>
                  {assignableMembers.map(person => (
                    <SelectItem key={person.id} value={person.id.toString()}>
                      {person.memberName} ({(person.careRole ?? "family member").replaceAll("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignableMembers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Add a home nurse, caretaker, or family member to assign this duty.</p>
              )}
            </div>
            <div>
              <Label>Instructions (Optional)</Label>
              <Textarea placeholder="Specific details for the caretaker..." value={dutyForm.instructions} onChange={e => setDutyForm(p => ({ ...p, instructions: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDutyOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDuty} disabled={!dutyForm.title || !dutyForm.category || !dutyForm.frequency || createDuty.isPending}>
              {createDuty.isPending ? "Adding..." : "Add Duty"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Form Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Care Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Related Duty</Label>
              <Select value={logForm.dutyId} onValueChange={v => setLogForm(p => ({ ...p, dutyId: v, category: v === "none" ? p.category : "" }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a duty or Unplanned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unplanned Activity</SelectItem>
                  {duties?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {logForm.dutyId === "none" && (
              <div>
                <Label>Category</Label>
                <Select value={logForm.category} onValueChange={v => setLogForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DUTY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>Status</Label>
              <Select value={logForm.status} onValueChange={v => setLogForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {LOG_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea placeholder="Any observations..." value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLog} disabled={!logForm.status || (logForm.dutyId === "none" && !logForm.category) || createLog.isPending}>
              {createLog.isPending ? "Saving..." : "Save Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
