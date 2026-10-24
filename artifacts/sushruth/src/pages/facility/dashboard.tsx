import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetFacilityDashboard, useListFacilityStaffRequests } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Building2, Users, PackageSearch, Activity, FileText, ArrowRight, UserPlus, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FacilityDashboard() {
  const { data: dashboard, isLoading } = useGetFacilityDashboard();
  const { data: staffRequests } = useListFacilityStaffRequests();
  const { toast } = useToast();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading facility dashboard...</div>;
  }

  const dashboardData = dashboard as any;
  const facilityId = dashboardData?.facilityId;
  const pendingRequestsCount = staffRequests?.filter((r) => r.status === "PENDING").length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Facility Operations</h1>
        <p className="text-slate-600 mt-2">Overview of PHC queues, incoming referrals, and resources.</p>
        {dashboardData?.facilityName && (
          <div className="mt-4 flex gap-3">
            <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded text-sm flex items-center gap-1.5">
              <Building2 className="h-4 w-4" /> {dashboardData.facilityName}
            </span>
            {dashboardData.facilityActive !== undefined && (
              <span className={`font-medium px-3 py-1 rounded text-sm ${dashboardData.facilityActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                Status: {dashboardData.facilityActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-blue-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="h-5 w-5" /></div>
              <h3 className="font-semibold text-slate-600 text-sm">Today's Queue</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{dashboardData?.patientsRegisteredToday}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-purple-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><FileText className="h-5 w-5" /></div>
              <h3 className="font-semibold text-slate-600 text-sm">Pending Referrals</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{dashboardData?.pendingReferrals}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Activity className="h-5 w-5" /></div>
              <h3 className="font-semibold text-slate-600 text-sm">Follow-ups Due Today</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{dashboardData?.followUpsDueToday}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-orange-100 shadow-sm hover:border-orange-300 transition-colors cursor-pointer">
          <Link href="/facility/inventory">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><PackageSearch className="h-5 w-5" /></div>
                <h3 className="font-semibold text-slate-600 text-sm">Stock Alerts</h3>
              </div>
              <p className="text-3xl font-bold text-orange-600">{dashboardData?.medicineStockAlerts}</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Action Queues</CardTitle>
            <CardDescription>Queues needing attention today</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.actionQueues ? (
               <div className="space-y-4">
                 {Object.entries(dashboardData.actionQueues).map(([queueName, queueVal]) => {
                    let count = 0;
                    if (Array.isArray(queueVal)) {
                      count = queueVal.length;
                    } else if (typeof queueVal === 'object' && queueVal !== null && 'count' in queueVal) {
                      count = Number((queueVal as any).count);
                    } else if (typeof queueVal === 'number' || typeof queueVal === 'string') {
                      count = Number(queueVal);
                    }
                    return (
                      <div key={queueName} className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="text-slate-700 font-medium capitalize">{queueName.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="text-slate-900 font-bold">{count}</div>
                      </div>
                    );
                 })}
               </div>
            ) : (
               <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                 No action queues available
               </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Other Operations</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                   <div className="text-slate-700 font-medium">Overdue Follow-ups</div>
                   <div className="text-red-600 font-bold">{dashboardData?.overdueFollowUps}</div>
                 </div>
                 <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                   <div className="text-slate-700 font-medium">Pending Investigations</div>
                   <div className="text-slate-900 font-bold">{dashboardData?.pendingInvestigations}</div>
                 </div>
                 <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                   <div className="text-slate-700 font-medium">High Risk Follow-ups</div>
                   <div className="text-orange-600 font-bold">{dashboardData?.highRiskFollowUps}</div>
                 </div>
                 <div className="flex justify-between items-center">
                   <div className="text-slate-700 font-medium flex flex-col">
                     Consultations Completed
                     {dashboardData?.consultationsCompleted?.source && (
                       <span className="text-xs text-slate-400 font-normal">Source: {dashboardData.consultationsCompleted.source}</span>
                     )}
                   </div>
                   <div className="text-slate-900 font-bold">{dashboardData?.consultationsCompleted?.count || 0}</div>
                 </div>
               </div>
            </CardContent>
          </Card>

          <Card className={`${pendingRequestsCount > 0 ? "border-amber-200" : "border-slate-200"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Staff Requests
                {pendingRequestsCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {pendingRequestsCount} Pending
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve clinical access for frontline workers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequestsCount > 0 ? (
                <div className="bg-amber-50 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3 text-amber-800">
                    <UserPlus className="h-5 w-5" />
                    <span className="font-medium">{pendingRequestsCount} workers awaiting approval</span>
                  </div>
                  <Link href="/facility/staff-requests">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                      Review Now
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-600">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span>All requests processed</span>
                  </div>
                  <Link href="/facility/staff-requests">
                    <Button variant="outline" size="sm">
                      View History
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}