import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListFollowUps, useRecordFollowUpOutcome, getListFollowUpsQueryKey } from "@workspace/api-client-react";
import { CalendarCheck, Phone, MapPin, CheckSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function HealthWorkerFollowUps() {
  const { data: followUps, isLoading } = useListFollowUps();
  const recordOutcome = useRecordFollowUpOutcome();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [outcomeData, setOutcomeData] = useState({ status: "COMPLETED", outcome: "PATIENT_CONTACTED", notes: "" });

  const handleRecordOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    recordOutcome.mutate(
      { id: selectedTask.id, data: { status: outcomeData.status as any, outcome: outcomeData.outcome as any, notes: outcomeData.notes } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFollowUpsQueryKey() });
          setSelectedTask(null);
          toast({ title: "Outcome recorded" });
          setOutcomeData({ status: "COMPLETED", outcome: "PATIENT_CONTACTED", notes: "" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Follow-up Tasks</h1>
        <p className="text-slate-600 mt-2">Manage due and overdue follow-ups in your sector.</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading tasks...</div>
      ) : followUps?.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
            <CheckSquare className="h-12 w-12 text-slate-300 mb-4" />
            No pending follow-ups found for today.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {followUps?.map((task: any) => {
            const isOverdue = new Date(task.dueDate) < new Date();
            return (
              <Card key={task.id} className={`border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{task.patientName || `Patient ${task.patientId}`}</CardTitle>
                    {isOverdue && (
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded uppercase">Overdue</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 font-medium mb-4">{task.taskDescription}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    {task.contactPhone && (
                      <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5"/> {task.contactPhone}</span>
                    )}
                    {task.locationText && (
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/> {task.locationText}</span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <Button 
                      variant="outline" 
                      className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => setSelectedTask(task)}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Record Outcome
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Follow-up Outcome</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <form onSubmit={handleRecordOutcome} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Outcome</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={outcomeData.outcome}
                  onChange={e => setOutcomeData({...outcomeData, outcome: e.target.value})}
                >
                  <option value="PATIENT_CONTACTED">Patient Contacted</option>
                  <option value="ATTENDED_FACILITY">Attended Facility</option>
                  <option value="PATIENT_UNAVAILABLE">Patient Unavailable</option>
                  <option value="APPOINTMENT_RESCHEDULED">Appointment Rescheduled</option>
                  <option value="REFERRED_AGAIN">Referred Again</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={outcomeData.status}
                  onChange={e => setOutcomeData({...outcomeData, status: e.target.value})}
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="MISSED">Missed</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Notes / Observations</Label>
                <Input 
                  required 
                  placeholder="Enter findings or reasons..."
                  value={outcomeData.notes} 
                  onChange={e => setOutcomeData({...outcomeData, notes: e.target.value})} 
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={recordOutcome.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {recordOutcome.isPending ? "Saving..." : "Save Outcome"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}