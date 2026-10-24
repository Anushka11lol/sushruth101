import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListInvestigationRequests, useUpdateInvestigationStatus, getListInvestigationRequestsQueryKey } from "@workspace/api-client-react";
import { Microscope, Beaker, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function HealthWorkerInvestigations() {
  const { data: requests, isLoading } = useListInvestigationRequests();
  const updateStatus = useUpdateInvestigationStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleUpdateStatus = (id: number, status: string) => {
    updateStatus.mutate(
      { id, data: { status: status as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvestigationRequestsQueryKey() });
          toast({ title: "Sample marked as collected" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Investigations Coordination</h1>
        <p className="text-slate-600 mt-2">Manage pending lab tests and sample collections.</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading requests...</div>
      ) : requests?.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Microscope className="h-12 w-12 text-slate-300 mb-4" />
            No pending investigation requests found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests?.map((req: any) => (
            <Card key={req.id} className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{req.patientName || `Patient ${req.patientId}`}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Beaker className="h-4 w-4 text-indigo-600" /> {req.testName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm px-2 py-1 rounded bg-slate-100 font-semibold text-slate-600 uppercase">
                    {req.status}
                  </span>
                  
                  {req.status === "REQUESTED" && (
                    <Button 
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => handleUpdateStatus(req.id, "SAMPLE_COLLECTED")}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Mark Collected
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}