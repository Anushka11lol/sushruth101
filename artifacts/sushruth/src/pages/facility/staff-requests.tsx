import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFacilityStaffRequests,
  useApproveFacilityStaffRequest,
  useRejectFacilityStaffRequest,
  getListFacilityStaffRequestsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ShieldAlert, User, Clock, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function FacilityStaffRequests() {
  const { data: requests, isLoading } = useListFacilityStaffRequests();
  const approveReq = useApproveFacilityStaffRequest();
  const rejectReq = useRejectFacilityStaffRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (id: number) => {
    approveReq.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFacilityStaffRequestsQueryKey() });
          toast({ title: "Request approved", description: "The health worker has been granted clinical access." });
        },
        onError: (err: any) => {
          toast({ title: "Approval failed", description: err.message || String(err), variant: "destructive" });
        },
      }
    );
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    rejectReq.mutate(
      { id: rejectId, data: { reason: rejectReason } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFacilityStaffRequestsQueryKey() });
          toast({ title: "Request rejected", description: "The health worker has been notified." });
          setRejectId(null);
          setRejectReason("");
        },
        onError: (err: any) => {
          toast({ title: "Rejection failed", description: err.message || String(err), variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading staff requests...</div>;
  }

  const pendingRequests = requests?.filter((r) => r.status === "PENDING") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Staff Requests</h1>
        <p className="text-slate-600 mt-2">Manage clinical access for frontline workers assigned to this facility.</p>
      </div>

      {pendingRequests.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <ShieldAlert className="h-12 w-12 mb-4 text-slate-400" />
            <p className="text-lg font-medium text-slate-700">No pending requests</p>
            <p className="text-sm mt-1">All health worker access requests have been processed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((req) => (
            <Card key={req.id} className="border-blue-100 shadow-sm" data-testid={`card-request-${req.id}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{req.fullName}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {req.workerType.replace(/_/g, " ")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Requested {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                      {req.workerId && (
                        <div>
                          <div className="text-slate-500 mb-1">Worker ID</div>
                          <div className="font-medium text-slate-900">{req.workerId}</div>
                        </div>
                      )}
                      {req.yearsExperience !== null && req.yearsExperience !== undefined && (
                        <div>
                          <div className="text-slate-500 mb-1">Experience</div>
                          <div className="font-medium text-slate-900">{req.yearsExperience} years</div>
                        </div>
                      )}
                      {req.training && (
                        <div className="col-span-2">
                          <div className="text-slate-500 mb-1">Training</div>
                          <div className="font-medium text-slate-900 truncate" title={req.training}>{req.training}</div>
                        </div>
                      )}
                    </div>

                    {req.professionalStatus === "UPDATE_REQUIRED" && (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-md text-sm border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        This worker was asked to update their profile. Proceed with caution.
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-3 md:min-w-[140px] shrink-0">
                    <Button
                      onClick={() => handleApprove(req.id)}
                      disabled={approveReq.isPending || rejectReq.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                      data-testid={`button-approve-${req.id}`}
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRejectId(req.id)}
                      disabled={approveReq.isPending || rejectReq.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-1"
                      data-testid={`button-reject-${req.id}`}
                    >
                      <X className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectId !== null} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Staff Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. The health worker will see this reason in their account portal.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Please update your worker ID to match the official registry."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-rejectReason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectReq.isPending}
              onClick={handleReject}
              data-testid="button-confirmReject"
            >
              {rejectReq.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
