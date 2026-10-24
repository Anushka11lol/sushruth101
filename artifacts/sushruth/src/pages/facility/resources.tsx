import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useListFacilityResources, useCreateFacilityResource, getListFacilityResourcesQueryKey, useGetFacilityDashboard } from "@workspace/api-client-react";
import { Building2, Plus, Users, HeartPulse, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function FacilityResources() {
  const { data: dashboard } = useGetFacilityDashboard();
  const facilityId = (dashboard as any)?.facilityId;

  const { data: resourcesData, isLoading } = useListFacilityResources(facilityId as number, { query: { enabled: !!facilityId, queryKey: getListFacilityResourcesQueryKey(facilityId as number) } });
  const resources = resourcesData as any;
  const createResource = useCreateFacilityResource();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    resourceType: "bed", 
    name: "", 
    status: "AVAILABLE"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    createResource.mutate(
      { 
        id: facilityId as number,
        data: { 
          resourceType: formData.resourceType, 
          name: formData.name, 
          status: formData.status as any
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFacilityResourcesQueryKey(facilityId as number) });
          setOpen(false);
          toast({ title: "Resource added" });
          setFormData({ resourceType: "bed", name: "", status: "AVAILABLE" });
        }
      }
    );
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "bed": return <Building2 className="h-5 w-5 text-blue-500" />;
      case "staff": return <Users className="h-5 w-5 text-emerald-500" />;
      case "equipment": return <HeartPulse className="h-5 w-5 text-purple-500" />;
      default: return <Building2 className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Facility Resources</h1>
          <p className="text-slate-600 mt-2">Manage beds, specialized staff, and critical equipment.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Resource</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Resource Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.resourceType}
                  onChange={e => setFormData({...formData, resourceType: e.target.value})}
                >
                  <option value="bed">Bed / Ward</option>
                  <option value="equipment">Medical Equipment</option>
                  <option value="staff">Specialized Staff</option>
                  <option value="vehicle">Ambulance / Vehicle</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Name / Identifier</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. ICU Bed 4" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createResource.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {createResource.isPending ? "Adding..." : "Add Resource"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading resources...</div>
      ) : resources?.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Building2 className="h-12 w-12 text-slate-300 mb-4" />
            No resources recorded for this facility yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources?.map((res: any) => (
            <Card key={res.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    {getResourceIcon(res.resourceType)}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {res.resourceType}
                  </span>
                </div>
                <CardTitle className="text-lg">{res.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mt-2">
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Status</div>
                    <div className="font-semibold text-xl text-slate-800 capitalize">{res.status?.toLowerCase() || "Available"}</div>
                  </div>
                  {res.status === "AVAILABLE" || !res.status ? (
                    <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">
                      <CheckCircle className="h-3.5 w-3.5" /> Ready
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                      Unavailable
                    </div>
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