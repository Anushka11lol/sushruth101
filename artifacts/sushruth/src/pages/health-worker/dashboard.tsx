import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Activity, Send, CalendarCheck, Baby, ActivitySquare, Microscope, ClipboardList, FileText } from "lucide-react";
import { useGetHealthWorkerProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function HealthWorkerDashboard() {
  const { data: profile, isLoading } = useGetHealthWorkerProfile();
  const { toast } = useToast();

  const QUICK_ACTIONS = [
    { href: "/health-worker/patients", label: "Register Patient", icon: Users, color: "bg-emerald-100 text-emerald-700" },
    { href: "/health-worker/vitals", label: "Record Vitals", icon: Activity, color: "bg-blue-100 text-blue-700" },
    { href: "/health-worker/referrals", label: "New Referral", icon: Send, color: "bg-purple-100 text-purple-700" },
    { href: "/health-worker/follow-ups", label: "Follow-ups", icon: CalendarCheck, color: "bg-orange-100 text-orange-700" },
    { href: "/health-worker/maternal", label: "Maternal Care", icon: Baby, color: "bg-pink-100 text-pink-700" },
    { href: "/health-worker/chronic-care", label: "Chronic Care", icon: ActivitySquare, color: "bg-red-100 text-red-700" },
    { href: "/health-worker/investigations", label: "Investigations", icon: Microscope, color: "bg-indigo-100 text-indigo-700" },
    { action: "case_taking", label: "Assisted Triage", icon: ClipboardList, color: "bg-teal-100 text-teal-700" },
    { action: "upload_report", label: "Upload Report", icon: FileText, color: "bg-cyan-100 text-cyan-700" }
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>;
  }

  const workerData = profile as any;

  const handleActionClick = (e: React.MouseEvent, action?: string) => {
    if (action) {
      e.preventDefault();
      toast({ 
        title: "Patient Context Required", 
        description: "Assisted case-taking and report upload must be launched from within a specific patient's record view. This feature will be enabled in the next update." 
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome, Health Worker</h1>
        <p className="text-slate-600 mt-2">Manage your tasks and coordinate patient care.</p>
        {workerData?.facilityId && (
          <p className="text-sm font-medium text-emerald-600 mt-1">Assigned to Facility #{workerData.facilityId}</p>
        )}
      </div>

      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, idx) => (
            action.href ? (
              <Link key={idx} href={action.href}>
                <Card className="hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer h-full">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                    <div className={`p-3 rounded-2xl ${action.color}`}>
                      <action.icon className="w-8 h-8" />
                    </div>
                    <span className="font-semibold text-slate-700">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card key={idx} className="hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer h-full" onClick={(e) => handleActionClick(e, action.action)}>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <div className={`p-3 rounded-2xl ${action.color}`}>
                    <action.icon className="w-8 h-8" />
                  </div>
                  <span className="font-semibold text-slate-700">{action.label}</span>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No recent activity recorded yet.
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              You're all caught up! No pending tasks.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}