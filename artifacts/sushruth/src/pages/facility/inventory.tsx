import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useListFacilityInventory, useUpsertFacilityInventory, getListFacilityInventoryQueryKey, useGetFacilityDashboard } from "@workspace/api-client-react";
import { Package, Search, Plus, AlertTriangle, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function FacilityInventory() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: dashboard } = useGetFacilityDashboard();
  const facilityId = (dashboard as any)?.facilityId;

  const { data: inventoryData, isLoading } = useListFacilityInventory(facilityId as number, { 
    query: { 
      enabled: !!facilityId, 
      queryKey: getListFacilityInventoryQueryKey(facilityId as number) 
    } 
  });
  
  const inventory = (inventoryData as any[])?.filter(item => 
    !searchQuery || item.medicineName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upsertInventory = useUpsertFacilityInventory();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    medicineName: "", 
    quantity: "", 
    unit: "tablets", 
    minimumThreshold: "" 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    upsertInventory.mutate(
      { 
        id: facilityId as number,
        data: { 
          medicineName: formData.medicineName, 
          quantity: Number(formData.quantity), 
          dosageForm: formData.unit,
          minimumStock: formData.minimumThreshold ? Number(formData.minimumThreshold) : 0
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFacilityInventoryQueryKey(facilityId as number) });
          setOpen(false);
          toast({ title: "Inventory updated" });
          setFormData({ medicineName: "", quantity: "", unit: "tablets", minimumThreshold: "" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Facility Inventory</h1>
          <p className="text-slate-600 mt-2">Manage medicine stock and track availability.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              Update Stock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Inventory Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Medicine Name</Label>
                <Input required value={formData.medicineName} onChange={e => setFormData({...formData, medicineName: e.target.value})} placeholder="e.g. Paracetamol 500mg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="tablets">Tablets</option>
                    <option value="vials">Vials</option>
                    <option value="bottles">Bottles</option>
                    <option value="kits">Kits</option>
                    <option value="units">Units</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Minimum Alert Threshold (Optional)</Label>
                <Input type="number" value={formData.minimumThreshold} onChange={e => setFormData({...formData, minimumThreshold: e.target.value})} />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={upsertInventory.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {upsertInventory.isPending ? "Saving..." : "Save Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search inventory..."
              className="pl-9 bg-slate-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading inventory...</div>
      ) : inventory?.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Package className="h-12 w-12 text-slate-300 mb-4" />
            No items found matching "{searchQuery}".
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inventory?.map((item: any) => {
            const isLowStock = item.minimumStock && item.quantity <= item.minimumStock;
            const isOutOfStock = item.quantity === 0;
            
            return (
              <Card key={item.id} className={`overflow-hidden border-t-4 ${isOutOfStock ? 'border-t-red-500' : isLowStock ? 'border-t-orange-500' : 'border-t-emerald-500'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg truncate" title={item.medicineName}>{item.medicineName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <div className={`text-3xl font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-slate-900'}`}>
                        {item.quantity}
                      </div>
                      <div className="text-sm text-slate-500 font-medium">{item.dosageForm}</div>
                    </div>
                    {isOutOfStock ? (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Low Stock
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md">
                        In Stock
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-400 flex items-center gap-1 pt-3 border-t border-slate-100">
                    <Clock className="h-3 w-3" /> Updated {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}