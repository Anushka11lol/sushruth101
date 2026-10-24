import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecordHealthWorkerVitals } from "@workspace/api-client-react";
import { Activity, Thermometer, Heart, Droplets, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HealthWorkerVitals() {
  const [patientId, setPatientId] = useState("");
  const [formData, setFormData] = useState({
    temperature: "",
    bloodPressureSys: "",
    bloodPressureDia: "",
    heartRate: "",
    oxygenLevel: "",
    weight: "",
    glucoseFasting: ""
  });
  
  const recordVitals = useRecordHealthWorkerVitals();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId) {
      toast({ title: "Patient ID required", variant: "destructive" });
      return;
    }

    recordVitals.mutate(
      { 
        data: { 
          patientUserId: patientId,
          values: {
            temperature: formData.temperature ? Number(formData.temperature) : undefined,
            bloodPressureSys: formData.bloodPressureSys ? Number(formData.bloodPressureSys) : undefined,
            bloodPressureDia: formData.bloodPressureDia ? Number(formData.bloodPressureDia) : undefined,
            heartRate: formData.heartRate ? Number(formData.heartRate) : undefined,
            oxygenLevel: formData.oxygenLevel ? Number(formData.oxygenLevel) : undefined,
            weight: formData.weight ? Number(formData.weight) : undefined,
            glucoseFasting: formData.glucoseFasting ? Number(formData.glucoseFasting) : undefined
          },
          source: "WORKER_RECORDED" as any
        } 
      },
      {
        onSuccess: () => {
          toast({
            title: "Vitals Recorded",
            description: "Successfully saved to patient record with WORKER-RECORDED provenance.",
          });
          setFormData({
            temperature: "",
            bloodPressureSys: "",
            bloodPressureDia: "",
            heartRate: "",
            oxygenLevel: "",
            weight: "",
            glucoseFasting: ""
          });
          setPatientId("");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Record Vitals</h1>
        <p className="text-slate-600 mt-2">Capture clinical measurements during field visits. Data is tagged with WORKER-RECORDED provenance.</p>
      </div>

      <Card className="max-w-2xl border-blue-200">
        <CardHeader className="bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-blue-800">New Measurement</CardTitle>
              <CardDescription className="text-blue-600">Enter available readings below</CardDescription>
            </div>
            <div className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              WORKER-RECORDED
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <Label className="text-slate-700 font-bold">Patient ID / Sushruth ID</Label>
              <Input 
                required 
                placeholder="e.g. PAT-12345" 
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="max-w-xs bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-slate-600"><Thermometer className="h-4 w-4 text-orange-500"/> Temp (°F)</Label>
                <Input 
                  type="number" step="0.1"
                  value={formData.temperature}
                  onChange={e => setFormData({...formData, temperature: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-slate-600"><Heart className="h-4 w-4 text-red-500"/> Pulse (bpm)</Label>
                <Input 
                  type="number" 
                  value={formData.heartRate}
                  onChange={e => setFormData({...formData, heartRate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-slate-600"><Activity className="h-4 w-4 text-blue-500"/> SpO2 (%)</Label>
                <Input 
                  type="number" 
                  value={formData.oxygenLevel}
                  onChange={e => setFormData({...formData, oxygenLevel: e.target.value})}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="flex items-center gap-1.5 text-slate-600"><Droplets className="h-4 w-4 text-red-600"/> Blood Pressure (mmHg)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" placeholder="Sys"
                    value={formData.bloodPressureSys}
                    onChange={e => setFormData({...formData, bloodPressureSys: e.target.value})}
                  />
                  <span className="text-slate-400 font-bold">/</span>
                  <Input 
                    type="number" placeholder="Dia"
                    value={formData.bloodPressureDia}
                    onChange={e => setFormData({...formData, bloodPressureDia: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-slate-600">Weight (kg)</Label>
                <Input 
                  type="number" step="0.1"
                  value={formData.weight}
                  onChange={e => setFormData({...formData, weight: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                disabled={recordVitals.isPending}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                {recordVitals.isPending ? "Saving..." : "Save Vitals"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}