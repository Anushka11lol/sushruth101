import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChildProfile,
  ImmunizationRecord,
  useEnsureVaccinationSchedule,
  useUpdateImmunization,
  useCreateImmunization,
  ImmunizationRecordStatus
} from "@workspace/api-client-react";
import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseISO, addDays, isBefore, isAfter, format } from "date-fns";
import { Shield, Clock, AlertCircle, CheckCircle2, Info, Plus, XCircle, Syringe, Calendar, HelpCircle } from "lucide-react";
import { ScheduleType, generateScheduleItems, getWindowEndDate, isSupplement } from "./vaccination-schedule";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VaccinationTrackerProps {
  child: ChildProfile;
  records: ImmunizationRecord[];
  userId: string;
  onRefresh: () => void;
  queryKey?: QueryKey;
}

export function VaccinationTracker({ child, records, userId, onRefresh, queryKey }: VaccinationTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType>("IAP");
  const [selectedRecord, setSelectedRecord] = useState<(ImmunizationRecord & { displayStatus: ImmunizationRecordStatus }) | null>(null);
  const [notApplicableReason, setNotApplicableReason] = useState("");
  
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    vaccineName: "",
    doseLabel: "",
    scheduledDate: "",
    administeredDate: "",
    notes: ""
  });

  const ensureSchedule = useEnsureVaccinationSchedule();
  const updateImm = useUpdateImmunization();
  const createImm = useCreateImmunization();
  
  const initializedForChild = useRef<string | null>(null);
  
  useEffect(() => {
    if (!child) return;
    const cacheKey = `${child.id}-${selectedSchedule}`;
    
    if (initializedForChild.current !== cacheKey) {
      initializedForChild.current = cacheKey;
      const items = generateScheduleItems(child.dateOfBirth, selectedSchedule);
      
      ensureSchedule.mutate({
        childId: child.id,
        data: {
          callerUserId: userId,
          scheduleType: selectedSchedule,
          records: items
        }
      }, {
        onSuccess: () => {
          if (queryKey) {
            queryClient.invalidateQueries({ queryKey });
          } else {
            onRefresh();
          }
        }
      });
    }
  }, [child, selectedSchedule, userId, ensureSchedule, queryKey, queryClient, onRefresh]);

  const scheduleRecords = useMemo(() => {
    return records.filter(r => r.scheduleType === selectedSchedule);
  }, [records, selectedSchedule]);

  const enhancedRecords = useMemo(() => {
    const today = new Date();
    return scheduleRecords.map(record => {
      let displayStatus = record.status as ImmunizationRecordStatus;
      
      if (displayStatus !== "completed" && displayStatus !== "not_applicable") {
        if (record.dueDate) {
          const dueDate = parseISO(record.dueDate);
          const windowEnd = getWindowEndDate(record.vaccineName, record.doseLabel, selectedSchedule, child.dateOfBirth);
          const dueWindowStart = addDays(today, 7);
          
          if (windowEnd && isAfter(today, windowEnd)) {
            displayStatus = "missed";
          } else if (isAfter(dueDate, dueWindowStart)) {
            displayStatus = "upcoming";
          } else {
            displayStatus = "due";
          }
        }
      }
      
      return { ...record, displayStatus };
    });
  }, [scheduleRecords, selectedSchedule, child.dateOfBirth]);

  const stats = useMemo(() => {
    const counts = { completed: 0, due: 0, upcoming: 0, missed: 0, na: 0 };
    enhancedRecords.forEach(r => {
      if (r.displayStatus === "completed") counts.completed++;
      else if (r.displayStatus === "due") counts.due++;
      else if (r.displayStatus === "upcoming") counts.upcoming++;
      else if (r.displayStatus === "missed") counts.missed++;
      else if (r.displayStatus === "not_applicable") counts.na++;
    });
    return counts;
  }, [enhancedRecords]);

  const groupedRecords = useMemo(() => {
    const map = new Map<string, typeof enhancedRecords>();
    enhancedRecords.forEach(r => {
      const age = r.recommendedAge || "Other";
      if (!map.has(age)) map.set(age, []);
      map.get(age)!.push(r);
    });
    
    return Array.from(map.entries()).map(([age, recs]) => {
      const minDate = recs.reduce((min, r) => {
        if (!r.dueDate) return min;
        const d = parseISO(r.dueDate);
        return isBefore(d, min) ? d : min;
      }, new Date("2100-01-01"));
      return { age, records: recs, minDate };
    }).sort((a, b) => a.minDate.getTime() - b.minDate.getTime());
  }, [enhancedRecords]);

  const handleStatusUpdate = (id: number, status: string, date?: string | null, reason?: string | null) => {
    updateImm.mutate({
      id,
      data: {
        callerUserId: userId,
        status: status as any,
        administeredDate: date ?? undefined,
        notApplicableReason: reason ?? undefined
      } as any
    }, {
      onSuccess: () => {
        toast({ title: "Record updated successfully" });
        if (queryKey) queryClient.invalidateQueries({ queryKey });
        else onRefresh();
        setSelectedRecord(null);
      }
    });
  };

  const handleHistorySubmit = () => {
    if (!historyForm.vaccineName || !historyForm.doseLabel || !historyForm.scheduledDate || !historyForm.administeredDate) return;
    
    createImm.mutate({
      childId: child.id,
      data: {
        callerUserId: userId,
        vaccineName: historyForm.vaccineName,
        doseLabel: historyForm.doseLabel,
        dueDate: historyForm.scheduledDate,
        administeredDate: historyForm.administeredDate,
        status: "completed",
        scheduleType: selectedSchedule,
        notes: historyForm.notes || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Historical record added" });
        setShowHistoryDialog(false);
        setHistoryForm({ vaccineName: "", doseLabel: "", scheduledDate: "", administeredDate: "", notes: "" });
        if (queryKey) queryClient.invalidateQueries({ queryKey });
        else onRefresh();
      }
    });
  };

  const nextVaccination = useMemo(() => {
    return enhancedRecords
      .filter(r => r.displayStatus === "due" || r.displayStatus === "upcoming")
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
      })[0];
  }, [enhancedRecords]);

  const renderStatusBadge = (status: ImmunizationRecordStatus) => {
    switch(status) {
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "due":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Due</Badge>;
      case "missed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Missed</Badge>;
      case "upcoming":
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200"><Calendar className="w-3 h-3 mr-1" /> Upcoming</Badge>;
      case "not_applicable":
        return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200"><XCircle className="w-3 h-3 mr-1" /> N/A</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Vaccination Timeline
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-xl">
            Based on the selected schedule, dates are calculated from your child's date of birth. 
            For personalized decisions or complex catch-up, consult your pediatrician.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Label className="text-slate-600 text-sm font-medium">Schedule:</Label>
          <Select value={selectedSchedule} onValueChange={(v) => setSelectedSchedule(v as ScheduleType)}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Select Schedule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IAP">IAP 2025 (Recommended)</SelectItem>
              <SelectItem value="UIP">Government (UIP / NIS)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
              <XCircle className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.na}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Not Applicable</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.due}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Due</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.missed}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Missed</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.upcoming}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Upcoming</p>
          </CardContent>
        </Card>
      </div>

      {(stats.missed > 0 || nextVaccination) && (
        <div className="grid md:grid-cols-2 gap-4">
          {stats.missed > 0 && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900">Missed Vaccinations</h4>
                <p className="text-sm text-red-700 mt-1">
                  You have {stats.missed} vaccination{stats.missed !== 1 ? 's' : ''} past their recommended window. Please consult your pediatrician for catch-up guidance.
                </p>
              </div>
            </div>
          )}
          {nextVaccination && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
              <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Next Up</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {nextVaccination.vaccineName} ({nextVaccination.doseLabel}) is scheduled for {nextVaccination.dueDate ? format(parseISO(nextVaccination.dueDate), "MMMM do, yyyy") : "soon"}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-900">Chronological Record</h3>
        <Button variant="outline" size="sm" onClick={() => setShowHistoryDialog(true)} className="text-teal-700 hover:text-teal-800 hover:bg-teal-50 border-teal-200">
          <Plus className="w-4 h-4 mr-2" /> Add Catch-up Record
        </Button>
      </div>

      <div className="space-y-6">
        {groupedRecords.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900">No records generated</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-1">Generating schedule based on {child.name}'s date of birth...</p>
          </div>
        )}
        
        {groupedRecords.map(group => (
          <div key={group.age} className="space-y-3">
            <h4 className="font-semibold text-slate-900 sticky top-0 bg-white/95 backdrop-blur py-2 border-b border-slate-100 flex items-center gap-2 z-10">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              {group.age} 
              {group.minDate.getFullYear() !== 2100 && (
                <span className="text-sm font-normal text-slate-500 ml-2">
                  (around {format(group.minDate, "MMM yyyy")})
                </span>
              )}
            </h4>
            <div className="grid gap-3">
              {group.records.map(record => (
                <div 
                  key={record.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors cursor-pointer hover:border-teal-300 ${
                    record.displayStatus === "completed" ? "bg-slate-50/50 border-slate-200" :
                    record.displayStatus === "due" ? "bg-amber-50/30 border-amber-200 shadow-sm" :
                    record.displayStatus === "missed" ? "bg-red-50/30 border-red-200" :
                    "bg-white border-slate-200 hover:shadow-sm"
                  }`}
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="flex gap-4 items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      record.displayStatus === "completed" ? "bg-green-100 text-green-600" :
                      record.displayStatus === "missed" ? "bg-red-100 text-red-600" :
                      record.displayStatus === "due" ? "bg-amber-100 text-amber-600" :
                      record.displayStatus === "not_applicable" ? "bg-slate-200 text-slate-500" :
                      "bg-blue-50 text-blue-600"
                    }`}>
                      {isSupplement(record.vaccineName) ? <Info className="w-5 h-5" /> : <Syringe className="w-5 h-5" />}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 flex items-center gap-2">
                        {record.vaccineName}
                        {isSupplement(record.vaccineName) && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-teal-100 text-teal-800 border-none">Supplement</Badge>
                        )}
                      </h5>
                      <p className="text-sm text-slate-600 font-medium">{record.doseLabel}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {record.dueDate && record.displayStatus !== "completed" && record.displayStatus !== "not_applicable" && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> 
                            {record.displayStatus === "missed" ? "Was due: " : "Due: "}
                            <span className="font-medium text-slate-700">{format(parseISO(record.dueDate), "MMM d, yyyy")}</span>
                          </span>
                        )}
                        {record.displayStatus === "completed" && record.administeredDate && (
                          <span className="text-xs text-green-700 flex items-center gap-1 font-medium">
                            <Shield className="w-3 h-3" /> Given: {format(parseISO(record.administeredDate), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:ml-auto">
                    {(record.reminder7Days || record.reminder3Days || record.reminder1Day) && record.displayStatus !== "completed" && record.displayStatus !== "not_applicable" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md font-medium border border-amber-100">
                            <AlertCircle className="w-3 h-3" /> Reminder active
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Reminder plan: 7 days, 3 days, and 1 day before the scheduled date.</TooltipContent>
                      </Tooltip>
                    )}
                    {renderStatusBadge(record.displayStatus)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90dvh] overflow-hidden p-0">
          {selectedRecord && (
            <div className="flex max-h-[90dvh] min-w-0 flex-col">
              <DialogHeader className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedRecord.displayStatus === "completed" ? "bg-green-100 text-green-600" :
                      selectedRecord.displayStatus === "missed" ? "bg-red-100 text-red-600" :
                      selectedRecord.displayStatus === "due" ? "bg-amber-100 text-amber-600" :
                      "bg-blue-50 text-blue-600"
                    }`}>
                    {isSupplement(selectedRecord.vaccineName) ? <Info className="w-5 h-5" /> : <Syringe className="w-5 h-5" />}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedRecord.vaccineName}</DialogTitle>
                    <DialogDescription className="font-medium text-slate-700">{selectedRecord.doseLabel}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 border border-slate-100">
                  <div className="font-medium text-slate-900 mb-1 flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-slate-400" /> Purpose</div>
                  {selectedRecord.purpose || "Preventive immunization"}
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm min-[420px]:grid-cols-2">
                  <div>
                    <span className="text-slate-500 block mb-1">Recommended Age</span>
                    <span className="font-medium text-slate-900">{selectedRecord.recommendedAge || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Status</span>
                    {renderStatusBadge(selectedRecord.displayStatus)}
                  </div>
                  {selectedRecord.dueDate && (
                    <div>
                      <span className="text-slate-500 block mb-1">Scheduled Date</span>
                      <span className="font-medium text-slate-900">{format(parseISO(selectedRecord.dueDate), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {selectedRecord.administeredDate && (
                    <div>
                      <span className="text-slate-500 block mb-1">Administered On</span>
                      <span className="font-medium text-green-700">{format(parseISO(selectedRecord.administeredDate), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>

                {selectedRecord.recommendedWindow && (
                  <div className="text-sm">
                    <span className="text-slate-500 block mb-1">Administration Window</span>
                    <span className="font-medium text-slate-900">{selectedRecord.recommendedWindow}</span>
                  </div>
                )}
                {selectedRecord.notApplicableReason && (
                  <div className="text-sm rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-slate-500 block mb-1">Pediatrician recommendation / reason</span>
                    <span className="font-medium text-slate-900">{selectedRecord.notApplicableReason}</span>
                  </div>
                )}
                {selectedRecord.dueDate && selectedRecord.displayStatus !== "completed" && selectedRecord.displayStatus !== "not_applicable" && (
                  <div className="text-sm">
                    <span className="text-slate-500 block mb-1">Reminder plan</span>
                    <span className="font-medium text-slate-900">
                      {format(addDays(parseISO(selectedRecord.dueDate), -7), "MMM d")}, {format(addDays(parseISO(selectedRecord.dueDate), -3), "MMM d")}, and {format(addDays(parseISO(selectedRecord.dueDate), -1), "MMM d")}
                    </span>
                  </div>
                )}
                {selectedRecord.displayStatus !== "completed" && selectedRecord.displayStatus !== "not_applicable" && (
                  <div className="space-y-2">
                    <Label htmlFor="not-applicable-reason">Pediatrician's reason if not applicable</Label>
                    <Input id="not-applicable-reason" className="w-full min-w-0" value={notApplicableReason} onChange={event => setNotApplicableReason(event.target.value)} placeholder="Record the recommendation or reason" />
                  </div>
                )}
              </div>

              <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-background px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6">
                {selectedRecord.displayStatus !== "completed" && selectedRecord.displayStatus !== "not_applicable" && (
                  <>
                    <Button variant="outline" className="w-full whitespace-normal text-slate-600 sm:mr-auto sm:w-auto" onClick={() => {
                       handleStatusUpdate(selectedRecord.id, "not_applicable", null, notApplicableReason.trim());
                     }} disabled={!notApplicableReason.trim()}>
                      Mark Not Applicable
                    </Button>
                    <Button onClick={() => {
                      if (confirm("Confirm this vaccination was given today?")) handleStatusUpdate(selectedRecord.id, "completed", new Date().toISOString().slice(0, 10), null);
                    }} className="w-full whitespace-normal bg-teal-600 text-white hover:bg-teal-700 sm:w-auto">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Given Today
                    </Button>
                  </>
                )}
                {(selectedRecord.displayStatus === "completed" || selectedRecord.displayStatus === "not_applicable") && (
                  <Button variant="outline" onClick={() => handleStatusUpdate(selectedRecord.id, "upcoming", null, null)}>
                    Undo status
                  </Button>
                )}
                <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setSelectedRecord(null)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Catch-up Record</DialogTitle>
            <DialogDescription>
              Record a vaccination that was administered previously. For complex catch-up schedules, consult your pediatrician.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vaccine Name</Label>
              <Input value={historyForm.vaccineName} onChange={e => setHistoryForm(prev => ({...prev, vaccineName: e.target.value}))} placeholder="e.g., MMR, Typhoid" />
            </div>
            <div className="space-y-2">
              <Label>Dose Label</Label>
              <Input value={historyForm.doseLabel} onChange={e => setHistoryForm(prev => ({...prev, doseLabel: e.target.value}))} placeholder="e.g., Dose 1, Booster" />
            </div>
            <div className="space-y-2">
              <Label>Original Scheduled Date</Label>
              <Input type="date" value={historyForm.scheduledDate} onChange={e => setHistoryForm(prev => ({...prev, scheduledDate: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Date Administered</Label>
              <Input type="date" value={historyForm.administeredDate} onChange={e => setHistoryForm(prev => ({...prev, administeredDate: e.target.value}))} max={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={historyForm.notes} onChange={e => setHistoryForm(prev => ({...prev, notes: e.target.value}))} placeholder="Clinic or pediatrician notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>Cancel</Button>
            <Button onClick={handleHistorySubmit} disabled={!historyForm.vaccineName || !historyForm.doseLabel || !historyForm.scheduledDate || !historyForm.administeredDate || createImm.isPending} className="bg-teal-600 hover:bg-teal-700 text-white">
              {createImm.isPending ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
