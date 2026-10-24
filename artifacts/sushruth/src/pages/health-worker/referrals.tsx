import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useListReferrals, useCreateReferral, useUpdateReferralStatus, getListReferralsQueryKey } from "@workspace/api-client-react";
import { Send, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function HealthWorkerReferrals() {
  const { data: referrals, isLoading } = useListReferrals();
  const createReferral = useCreateReferral();
  const updateStatus = useUpdateReferralStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ patientUserId: "", reason: "", destinationFacilityId: "", priority: "NORMAL" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReferral.mutate(
      { data: { ...formData, destinationFacilityId: Number(formData.destinationFacilityId), priority: formData.priority as any, referralDate: new Date().toISOString() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReferralsQueryKey() });
          setOpen(false);
          toast({ title: "Referral created successfully" });
          setFormData({ patientUserId: "", reason: "", destinationFacilityId: "", priority: "NORMAL" });
        }
      }
    );
  };

  const handleUpdateStatus = (id: number, status: string) => {
    updateStatus.mutate(
      { id, data: { status: status as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReferralsQueryKey() });
          toast({ title: "Status updated" });
        }
      }
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "HIGH_PRIORITY": return "text-red-700 bg-red-100";
      case "URGENT": return "text-orange-700 bg-orange-100";
      default: return "text-blue-700 bg-blue-100";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Referrals</h1>
          <p className="text-slate-600 mt-2">Manage patient referrals to higher-level facilities.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Send className="h-4 w-4 mr-2" />
              New Referral
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Referral</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Patient User ID</Label>
                <Input required value={formData.patientUserId} onChange={e => setFormData({...formData, patientUserId: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Reason for Referral</Label>
                <Input required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Destination Facility ID</Label>
                <Input required type="number" value={formData.destinationFacilityId} onChange={e => setFormData({...formData, destinationFacilityId: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH_PRIORITY">High Priority</option>
                </select>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createReferral.isPending} className="bg-purple-600 hover:bg-purple-700">
                  {createReferral.isPending ? "Submitting..." : "Submit Referral"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading referrals...</div>
      ) : referrals?.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="p-12 text-center text-slate-500">
            No active referrals found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {referrals?.map((ref: any) => (
            <Card key={ref.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="p-4 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${getUrgencyColor(ref.priority)}`}>
                      {ref.priority}
                    </span>
                    <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-800">{ref.patientName || `Patient ${ref.patientId}`}</h3>
                  <p className="text-slate-600 mt-1">{ref.reason}</p>
                  <div className="mt-3 flex items-center text-sm text-slate-500 gap-2">
                    <span className="font-medium text-slate-700">From:</span> {ref.referringFacilityName || "Field Worker"}
                    <ArrowRight className="h-4 w-4 mx-1" />
                    <span className="font-medium text-slate-700">To:</span> {ref.destinationFacilityName || `Facility ${ref.destinationFacilityId}`}
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 border-t md:border-t-0 md:border-l border-slate-100 flex flex-row md:flex-col items-center justify-between gap-3 min-w-[200px]">
                  <div className="text-center w-full">
                    <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Status</div>
                    <div className="font-semibold text-slate-800">{ref.status.replace("_", " ")}</div>
                  </div>
                  
                  {ref.status === "CREATED" && (
                    <div className="flex flex-col gap-2 w-full">
                      <Button size="sm" variant="outline" className="w-full text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => handleUpdateStatus(ref.id, "ACCEPTED")}>
                        <CheckCircle className="h-4 w-4 mr-1.5" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="w-full text-red-700 border-red-200 hover:bg-red-50" onClick={() => handleUpdateStatus(ref.id, "REJECTED")}>
                        Reject
                      </Button>
                      <Button size="sm" variant="ghost" className="w-full text-slate-500" onClick={() => handleUpdateStatus(ref.id, "CANCELLED")}>
                        Cancel
                      </Button>
                    </div>
                  )}
                  {ref.status === "ACCEPTED" && (
                    <div className="flex flex-col gap-2 w-full">
                      <Button size="sm" variant="outline" className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50" onClick={() => handleUpdateStatus(ref.id, "APPOINTMENT_SCHEDULED")}>
                        Schedule Appt
                      </Button>
                      <Button size="sm" variant="ghost" className="w-full text-slate-500" onClick={() => handleUpdateStatus(ref.id, "CANCELLED")}>
                        Cancel
                      </Button>
                    </div>
                  )}
                  {ref.status === "APPOINTMENT_SCHEDULED" && (
                    <div className="flex flex-col gap-2 w-full">
                      <Button size="sm" variant="outline" className="w-full text-purple-700 border-purple-200 hover:bg-purple-50" onClick={() => handleUpdateStatus(ref.id, "CONSULTED")}>
                        Mark Consulted
                      </Button>
                      <Button size="sm" variant="ghost" className="w-full text-slate-500" onClick={() => handleUpdateStatus(ref.id, "CANCELLED")}>
                        Cancel
                      </Button>
                    </div>
                  )}
                  {ref.status === "CONSULTED" && (
                    <div className="flex flex-col gap-2 w-full">
                      <Button size="sm" variant="outline" className="w-full text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => handleUpdateStatus(ref.id, "INVESTIGATION_PENDING")}>
                        Need Investigation
                      </Button>
                      <Button size="sm" variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => handleUpdateStatus(ref.id, "COMPLETED")}>
                        Complete
                      </Button>
                      <Button size="sm" variant="ghost" className="w-full text-slate-500" onClick={() => handleUpdateStatus(ref.id, "CANCELLED")}>
                        Cancel
                      </Button>
                    </div>
                  )}
                  {ref.status === "INVESTIGATION_PENDING" && (
                    <div className="flex flex-col gap-2 w-full">
                      <Button size="sm" variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => handleUpdateStatus(ref.id, "COMPLETED")}>
                        Complete
                      </Button>
                      <Button size="sm" variant="ghost" className="w-full text-slate-500" onClick={() => handleUpdateStatus(ref.id, "CANCELLED")}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}