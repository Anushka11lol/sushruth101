import { useMemo, useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAddCareCircleMember,
  useCreateCareCircleDuty,
  useListCareCircleDailyCareLogs,
  useListCareCircleDuties,
  useListCareCircleMembers,
  getListCareCircleDutiesQueryKey,
  getListCareCircleMembersQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock3, Phone, ShieldCheck, Stethoscope, UserPlus } from "lucide-react";

export default function CaretakersPage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", role: "home_nurse", phone: "", agency: "", shift: "Day Shift",
    recipientId: "", duties: "Insulin administration\nBP check 2x daily\nMobility support",
  });
  const { data: members = [] } = useListCareCircleMembers({ userId }, { query: { enabled: !!userId } as any });
  const { data: duties = [] } = useListCareCircleDuties({ userId }, { query: { enabled: !!userId } as any });
  const { data: logs = [] } = useListCareCircleDailyCareLogs({ userId }, { query: { enabled: !!userId } as any });
  const addMember = useAddCareCircleMember();
  const createDuty = useCreateCareCircleDuty();

  const caregivers = useMemo(() => members.filter(m => ["home_nurse", "caretaker"].includes(m.careRole ?? "")), [members]);
  const recipients = useMemo(() => members.filter(m => !["home_nurse", "caretaker"].includes(m.careRole ?? "")), [members]);

  const register = async () => {
    if (!form.name || !form.phone || !form.recipientId) return;
    const caregiver = await addMember.mutateAsync({ data: {
      userId, memberName: form.name, relationship: "Caregiver", careRole: form.role,
      phone: form.phone, healthStatus: `${form.agency || "Independent caregiver"} • ${form.shift}`,
    } as any });
    for (const title of form.duties.split("\n").map(v => v.trim()).filter(Boolean)) {
      await createDuty.mutateAsync({ data: {
        userId, memberId: Number(form.recipientId), assignedToMemberId: caregiver.id,
        title, category: title.toLowerCase().includes("bp") ? "Vitals" : title.toLowerCase().includes("insulin") ? "Medication" : "Mobility",
        frequency: title.toLowerCase().includes("2x") ? "Twice Daily" : "Daily",
        instructions: `${form.agency || "Independent caregiver"} • ${form.shift}`,
      } });
    }
    queryClient.invalidateQueries({ queryKey: getListCareCircleMembersQueryKey({ userId }) });
    queryClient.invalidateQueries({ queryKey: getListCareCircleDutiesQueryKey({ userId }) });
    setOpen(false);
  };

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold">Caretaker / Nurse</h1><p className="text-muted-foreground">Healthcare workers assigned to each family member.</p></div>
      <Button onClick={() => setOpen(true)} disabled={recipients.length === 0}><UserPlus className="mr-2 h-4 w-4"/>Register Caretaker</Button>
    </div>
    {recipients.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Add a family member in Care Circle first. You can then register and assign their nurse or caretaker here.</CardContent></Card>}
    {caregivers.length === 0 && recipients.length > 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No caretaker is registered yet.</CardContent></Card>}
    <div className="grid gap-4">
      {caregivers.map(caregiver => {
        const assigned = duties.filter(d => d.assignedToMemberId === caregiver.id);
        const recipientIds = [...new Set(assigned.map(d => d.memberId))];
        const isVerified = caregiver.verificationStatus === "verified";
        return <Card key={caregiver.id}>
          <CardHeader className="pb-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-teal-600"/>{caregiver.memberName}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{(caregiver.careRole ?? "caretaker").replaceAll("_", " ")}</p></div>
            <div className="flex flex-wrap gap-2">
              {isVerified ? <>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><ShieldCheck className="mr-1 h-3 w-3"/>Aadhaar Identity Verified</Badge>
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50"><ShieldCheck className="mr-1 h-3 w-3"/>State Police Clearance Certified</Badge>
              </> : <Badge variant="outline">Credentials awaiting manual review</Badge>}
            </div>
          </div></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{caregiver.phone}</span>
              <span>{caregiver.healthStatus?.split(" • ")[0] || "Independent caregiver"}</span>
              <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground"/>{caregiver.healthStatus?.split(" • ")[1] || "Shift not recorded"}</span>
            </div>
            {recipientIds.map(id => {
              const recipient = members.find(m => m.id === id);
              const recipientDuties = assigned.filter(d => d.memberId === id);
              const recipientLogs = logs.filter(l => l.memberId === id);
              return <div key={id} className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold">Assigned senior: {recipient?.memberName ?? "Family member"}{recipient?.healthStatus ? ` — ${recipient.healthStatus}` : ""}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {recipientDuties.map(d => <div key={d.id} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600"/>{d.title} <Badge variant="outline">{d.frequency}</Badge></div>)}
                </div>
                <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Shared family care logs</p>
                {recipientLogs.length ? recipientLogs.slice(0, 5).map(log => <p key={log.id} className="mt-2 rounded-lg bg-background p-2 text-sm">{log.category}: {log.status}{log.notes ? ` — ${log.notes}` : ""} <span className="text-muted-foreground">({log.recordedBy || "care team"})</span></p>) : <p className="mt-2 text-sm text-muted-foreground">No care logs recorded yet. Logs added in Care Circle appear here for the family.</p>}
              </div>;
            })}
          </CardContent>
        </Card>;
      })}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Register Caretaker / Nurse</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Legal name</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div><Label>Worker type</Label><Select value={form.role} onValueChange={role=>setForm({...form,role})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="home_nurse">Home Nurse</SelectItem><SelectItem value="caretaker">Caretaker</SelectItem></SelectContent></Select></div>
        <div><Label>Phone number</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div><Label>Registered nursing agency</Label><Input placeholder="Max Home Care" value={form.agency} onChange={e=>setForm({...form,agency:e.target.value})}/></div>
        <div><Label>Assigned family member</Label><Select value={form.recipientId} onValueChange={recipientId=>setForm({...form,recipientId})}><SelectTrigger><SelectValue placeholder="Choose family member"/></SelectTrigger><SelectContent>{recipients.map(r=><SelectItem key={r.id} value={String(r.id)}>{r.memberName}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Shift hours</Label><Select value={form.shift} onValueChange={shift=>setForm({...form,shift})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Day Shift">Day Shift</SelectItem><SelectItem value="Night Shift">Night Shift</SelectItem><SelectItem value="24/7 Residential">24/7 Residential</SelectItem></SelectContent></Select></div>
        <div className="sm:col-span-2"><Label>Daily duties (one per line)</Label><Textarea rows={5} value={form.duties} onChange={e=>setForm({...form,duties:e.target.value})}/></div>
        <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Credential badges must only be used after Aadhaar identity and state police-clearance documents have been reviewed. Sushruth does not perform government verification automatically.</div>
      </div>
      <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={register} disabled={!form.name||!form.phone||!form.recipientId||addMember.isPending||createDuty.isPending}>Register & Assign</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}