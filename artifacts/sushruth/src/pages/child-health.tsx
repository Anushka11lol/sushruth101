import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListChildren,
  useCreateChild,
  useGrantChildGuardian,
  useListImmunizations,
  useCreateImmunization,
  useUpdateImmunization,
  useDeleteImmunization,
  useListCareCircleMembers,
  getListChildrenQueryKey,
  getListImmunizationsQueryKey,
  getListCareCircleMembersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Baby, Syringe, Plus, Calendar, Shield, Users, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VaccinationTracker } from "@/components/child-health/VaccinationTracker";

export default function ChildHealthPage() {
  const { user } = useUser();
  const userId = user?.id || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // Modals
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [showAddImmunization, setShowAddImmunization] = useState(false);
  const [showUpdateImmunization, setShowUpdateImmunization] = useState<number | null>(null);
  
  // Data Fetching
  const { data: children, isLoading: loadingChildren } = useListChildren(
    { callerUserId: userId },
    { query: { enabled: !!userId, queryKey: getListChildrenQueryKey({ callerUserId: userId }) } }
  );
  
  const { data: immunizations, isLoading: loadingImmunizations } = useListImmunizations(
    selectedChildId as number,
    { callerUserId: userId },
    { query: { enabled: !!selectedChildId && !!userId, queryKey: selectedChildId ? getListImmunizationsQueryKey(selectedChildId, { callerUserId: userId }) : [] } }
  );

  const { data: careCircle } = useListCareCircleMembers(
    { userId },
    { query: { enabled: !!userId, queryKey: getListCareCircleMembersQueryKey({ userId }) } }
  );

  const activeChild = children?.find(c => c.id === selectedChildId);
  const manualImmunizations = immunizations?.filter(imm => !imm.recommendedAge) || [];

  // Set selected child automatically if none selected and children exist
  useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  // Mutations
  const createChild = useCreateChild();
  const grantGuardian = useGrantChildGuardian();
  const createImmunization = useCreateImmunization();
  const updateImmunization = useUpdateImmunization();
  const deleteImmunization = useDeleteImmunization();

  // Child Form State
  const [childForm, setChildForm] = useState({
    name: "",
    dateOfBirth: "",
    sex: "",
    bloodGroup: "",
    secondParentUserId: ""
  });

  // Guardian Form State
  const [guardianForm, setGuardianForm] = useState({
    linkedUserId: "",
    relationship: "Parent"
  });

  // Immunization Form State
  const [immForm, setImmForm] = useState({
    vaccineName: "",
    doseLabel: "",
    dueDate: "",
    status: "scheduled" as any
  });

  // Handlers
  const handleAddChild = () => {
    createChild.mutate({
      data: {
        name: childForm.name,
        dateOfBirth: childForm.dateOfBirth,
        sex: childForm.sex,
        bloodGroup: childForm.bloodGroup,
        createdByUserId: userId,
        secondParentUserId: childForm.secondParentUserId || undefined
      }
    }, {
      onSuccess: (newChild) => {
        queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey({ callerUserId: userId }) });
        setSelectedChildId(newChild.id);
        setShowAddChild(false);
        setChildForm({ name: "", dateOfBirth: "", sex: "", bloodGroup: "", secondParentUserId: "" });
        toast({ title: "Child profile added successfully" });
      },
      onError: () => {
        toast({
          title: "Could not add child profile",
          description: "Child profiles are only available for people under 18. Please verify the date of birth and try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleAddGuardian = () => {
    if (!selectedChildId || !guardianForm.linkedUserId) return;
    grantGuardian.mutate({
      id: selectedChildId,
      data: {
        callerUserId: userId,
        linkedUserId: guardianForm.linkedUserId,
        relationship: guardianForm.relationship,
        accessLevel: "manage"
      }
    }, {
      onSuccess: () => {
        toast({ title: "Guardian access granted" });
        setShowAddGuardian(false);
        setGuardianForm({ linkedUserId: "", relationship: "Parent" });
      }
    });
  };

  const handleAddImmunization = () => {
    if (!selectedChildId) return;
    createImmunization.mutate({
      childId: selectedChildId,
      data: {
        callerUserId: userId,
        vaccineName: immForm.vaccineName,
        doseLabel: immForm.doseLabel,
        dueDate: immForm.dueDate || undefined,
        status: immForm.status,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListImmunizationsQueryKey(selectedChildId, { callerUserId: userId }) });
        setShowAddImmunization(false);
        setImmForm({ vaccineName: "", doseLabel: "", dueDate: "", status: "scheduled" });
        toast({ title: "Immunization added" });
      }
    });
  };

  const handleStatusUpdate = (immId: number, status: string, date?: string) => {
    updateImmunization.mutate({
      id: immId,
      data: {
        callerUserId: userId,
        status: status as any,
        administeredDate: date
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListImmunizationsQueryKey(selectedChildId!, { callerUserId: userId }) });
        toast({ title: "Immunization updated" });
      }
    });
  };

  const handleDeleteImmunization = (id: number) => {
    if (confirm("Are you sure you want to delete this immunization?")) {
      deleteImmunization.mutate({
        id,
        params: { callerUserId: userId }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListImmunizationsQueryKey(selectedChildId!, { callerUserId: userId }) });
        }
      });
    }
  };

  const eligibleGuardians = careCircle?.filter(m => m.linkedUserId) || [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Child Health</h1>
          <p className="text-muted-foreground mt-1">Manage profiles and immunizations for your children.</p>
        </div>
        <Button onClick={() => setShowAddChild(true)}>
          <Baby className="mr-2 h-4 w-4" />
          Add Child
        </Button>
      </div>

      {loadingChildren ? (
        <Skeleton className="h-16 w-full" />
      ) : children && children.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border ${
                selectedChildId === child.id 
                  ? 'bg-teal-600 text-white border-teal-600' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Baby className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No children added yet.</p>
          </CardContent>
        </Card>
      )}

      {activeChild && (
        <>
          <VaccinationTracker
            child={activeChild}
            records={immunizations || []}
            userId={userId}
            onRefresh={() => selectedChildId && queryClient.invalidateQueries({ queryKey: getListImmunizationsQueryKey(selectedChildId, { callerUserId: userId }) })}
          />
          <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader className="bg-slate-50 pb-4 border-b">
                <CardTitle className="text-lg flex items-center justify-between">
                  Profile
                  <Badge variant="outline">{activeChild.bloodGroup || 'N/A'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Name</p>
                  <p className="font-medium">{activeChild.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Date of Birth</p>
                  <p className="font-medium">{new Date(activeChild.dateOfBirth).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Sex</p>
                  <p className="font-medium">{activeChild.sex || 'Not specified'}</p>
                </div>
                
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full text-xs" size="sm" onClick={() => setShowAddGuardian(true)}>
                    <Users className="h-3.5 w-3.5 mr-2" /> Add Guardian Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Syringe className="h-5 w-5 text-teal-600" />
                   Additional immunization records
                </CardTitle>
                <Button size="sm" onClick={() => setShowAddImmunization(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingImmunizations ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : manualImmunizations.length > 0 ? (
                  <div className="divide-y">
                    {manualImmunizations.map(imm => {
                      const isCompleted = imm.status === 'completed';
                      const isMissed = imm.status === 'missed';
                      
                      return (
                        <div key={imm.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex gap-4 items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isCompleted ? 'bg-green-100 text-green-600' :
                              isMissed ? 'bg-red-100 text-red-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {isCompleted ? <CheckCircle2 className="h-5 w-5" /> :
                               isMissed ? <AlertCircle className="h-5 w-5" /> :
                               <Clock className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{imm.vaccineName}</p>
                              <p className="text-sm text-slate-600">Dose: {imm.doseLabel}</p>
                              {imm.dueDate && !isCompleted && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Due: {new Date(imm.dueDate).toLocaleDateString()}
                                </p>
                              )}
                              {isCompleted && imm.administeredDate && (
                                <>
                                  {imm.dueDate && (
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <Calendar className="h-3 w-3" /> Originally scheduled: {new Date(imm.dueDate).toLocaleDateString()}
                                    </p>
                                  )}
                                  <p className="text-xs text-green-700 mt-1 flex items-center gap-1 font-medium">
                                    <Shield className="h-3 w-3" /> Given: {new Date(imm.administeredDate).toLocaleDateString()}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!isCompleted && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                                onClick={() => handleStatusUpdate(imm.id, 'completed', new Date().toISOString().slice(0, 10))}
                              >
                                Mark Done
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => handleDeleteImmunization(imm.id)}>
                              <Plus className="h-4 w-4 rotate-45" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No immunizations recorded.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>
        </>
      )}

      {/* Add Child Dialog */}
      <Dialog open={showAddChild} onOpenChange={setShowAddChild}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Child Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={childForm.name} onChange={e => setChildForm({...childForm, name: e.target.value})} placeholder="Child's full name" />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={childForm.dateOfBirth} onChange={e => setChildForm({...childForm, dateOfBirth: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sex</Label>
                <Select value={childForm.sex} onValueChange={v => setChildForm({...childForm, sex: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Blood Group</Label>
                <Input value={childForm.bloodGroup} onChange={e => setChildForm({...childForm, bloodGroup: e.target.value})} placeholder="e.g. O+" />
              </div>
            </div>
            {eligibleGuardians.length > 0 && (
              <div>
                <Label>Optional Second Parent (from Care Circle)</Label>
                <Select value={childForm.secondParentUserId} onValueChange={v => setChildForm({...childForm, secondParentUserId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select co-parent" /></SelectTrigger>
                  <SelectContent>
                    {eligibleGuardians.map(g => (
                      <SelectItem key={g.id} value={g.linkedUserId!}>{g.memberName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChild(false)}>Cancel</Button>
            <Button onClick={handleAddChild} disabled={!childForm.name || !childForm.dateOfBirth || createChild.isPending}>
              {createChild.isPending ? "Adding..." : "Add Child"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Guardian Dialog */}
      <Dialog open={showAddGuardian} onOpenChange={setShowAddGuardian}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Guardian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {eligibleGuardians.length === 0 ? (
              <p className="text-sm text-slate-600">You don't have any linked Care Circle members. Add a member with a linked User ID in your Care Circle first.</p>
            ) : (
              <>
                <div>
                  <Label>Select linked member</Label>
                  <Select value={guardianForm.linkedUserId} onValueChange={v => setGuardianForm({...guardianForm, linkedUserId: v})}>
                    <SelectTrigger><SelectValue placeholder="Choose person" /></SelectTrigger>
                    <SelectContent>
                      {eligibleGuardians.map(g => (
                        <SelectItem key={g.id} value={g.linkedUserId!}>{g.memberName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Select value={guardianForm.relationship} onValueChange={v => setGuardianForm({...guardianForm, relationship: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Grandparent">Grandparent</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGuardian(false)}>Cancel</Button>
            <Button onClick={handleAddGuardian} disabled={!guardianForm.linkedUserId || grantGuardian.isPending}>
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Immunization Dialog */}
      <Dialog open={showAddImmunization} onOpenChange={setShowAddImmunization}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Immunization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vaccine Name</Label>
              <Input value={immForm.vaccineName} onChange={e => setImmForm({...immForm, vaccineName: e.target.value})} placeholder="e.g. Polio, MMR" />
            </div>
            <div>
              <Label>Dose Label</Label>
              <Input value={immForm.doseLabel} onChange={e => setImmForm({...immForm, doseLabel: e.target.value})} placeholder="e.g. Dose 1, Booster" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={immForm.dueDate} onChange={e => setImmForm({...immForm, dueDate: e.target.value})} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={immForm.status} onValueChange={v => setImmForm({...immForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddImmunization(false)}>Cancel</Button>
            <Button onClick={handleAddImmunization} disabled={!immForm.vaccineName || !immForm.doseLabel || createImmunization.isPending}>
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}