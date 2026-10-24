import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useListMaternalProfiles } from "@workspace/api-client-react";
import { Baby, Calendar } from "lucide-react";

export default function HealthWorkerMaternal() {
  const { data: profiles, isLoading } = useListMaternalProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Maternal & ANC Coordination</h1>
        <p className="text-slate-600 mt-2">Manage antenatal care and maternal health records.</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading maternal records...</div>
      ) : profiles?.length === 0 ? (
        <Card className="bg-pink-50 border-pink-100">
          <CardContent className="p-12 text-center text-pink-700 flex flex-col items-center">
            <Baby className="h-12 w-12 text-pink-300 mb-4" />
            No active maternal care records found in your sector.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles?.map((profile: any) => (
            <Card key={profile.id} className="border-l-4 border-l-pink-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{profile.patientName || `Patient ${profile.patientId}`}</CardTitle>
                <CardDescription>Trimester: {profile.trimester || "Unknown"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <Calendar className="h-4 w-4 text-pink-500" />
                  <span className="font-medium">EDD:</span> {profile.edd ? new Date(profile.edd).toLocaleDateString() : "Not set"}
                </div>
                {profile.highRiskFactors && profile.highRiskFactors.length > 0 && (
                  <div className="mt-3 bg-red-50 text-red-700 p-2 rounded text-xs font-medium border border-red-100">
                    High Risk: {profile.highRiskFactors.join(", ")}
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