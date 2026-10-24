import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useListChronicCareProfiles } from "@workspace/api-client-react";
import { ActivitySquare, AlertCircle } from "lucide-react";

export default function HealthWorkerChronicCare() {
  const { data: profiles, isLoading } = useListChronicCareProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Chronic Care Continuity</h1>
        <p className="text-slate-600 mt-2">Monitor patients with hypertension, diabetes, and other chronic conditions.</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading chronic care records...</div>
      ) : profiles?.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
            <ActivitySquare className="h-12 w-12 text-slate-300 mb-4" />
            No active chronic care patients found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles?.map((profile: any) => (
            <Card key={profile.id} className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{profile.patientName || `Patient ${profile.patientId}`}</CardTitle>
                <CardDescription className="font-medium text-slate-700">{profile.conditionName}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">Risk Level: <span className="font-bold uppercase">{profile.riskLevel}</span></p>
                {profile.complianceStatus === "poor" && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                    <AlertCircle className="h-4 w-4" /> Poor adherence detected. Follow-up required.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}