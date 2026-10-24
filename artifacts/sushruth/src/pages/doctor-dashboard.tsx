import { useState } from "react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { useListDoctorPreConsultations, getListDoctorPreConsultationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardList, Search, Filter, ChevronRight, 
  Clock, CheckCircle2, AlertCircle, FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function DoctorDashboardPage() {
  const { user } = useUser();
  const userId = user?.id || "";
  
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: consultations, isLoading } = useListDoctorPreConsultations(
    { callerUserId: userId, status: filterStatus !== "all" ? filterStatus : undefined },
    { query: { enabled: !!userId, queryKey: getListDoctorPreConsultationsQueryKey({ callerUserId: userId, status: filterStatus !== "all" ? filterStatus : undefined }) } }
  );

  const filteredData = consultations?.filter(c => 
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clinician Workspace</h1>
          <p className="text-slate-600 mt-1">Review pre-consultation intakes and manage your queue.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-800 uppercase tracking-wider mb-1">In Queue</p>
                <h3 className="text-3xl font-bold text-teal-900">
                  {filterStatus === "pending" && consultations ? consultations.length : "-"}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-200 flex items-center justify-center">
                <Clock className="h-6 w-6 text-teal-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Button 
              variant={filterStatus === "pending" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterStatus("pending")}
              className={filterStatus === "pending" ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              Pending Review
            </Button>
            <Button 
              variant={filterStatus === "reviewed" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterStatus("reviewed")}
              className={filterStatus === "reviewed" ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              Reviewed
            </Button>
            <Button 
              variant={filterStatus === "incomplete" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterStatus("incomplete")}
              className={filterStatus === "incomplete" ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              Sent Back
            </Button>
            <Button 
              variant={filterStatus === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterStatus("all")}
              className={filterStatus === "all" ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              All
            </Button>
          </div>
          
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search patients..." 
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : filteredData && filteredData.length > 0 ? (
            filteredData.map(consultation => (
              <div key={consultation.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-center group">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    consultation.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    consultation.status === 'reviewed' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {consultation.status === 'pending' ? <Clock className="h-6 w-6" /> :
                     consultation.status === 'reviewed' ? <CheckCircle2 className="h-6 w-6" /> :
                     <AlertCircle className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{consultation.patientName}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> 
                        Submitted: {new Date(consultation.submittedAt).toLocaleDateString()}
                      </span>
                      {consultation.language !== 'en' && (
                        <Badge variant="secondary" className="text-[10px] uppercase bg-slate-200 text-slate-700">
                          Lang: {consultation.language}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-auto flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                  <Badge variant={
                    consultation.status === 'pending' ? 'outline' :
                    consultation.status === 'reviewed' ? 'default' : 'destructive'
                  } className="sm:hidden">
                    {consultation.status.toUpperCase()}
                  </Badge>
                  
                  <Link href={`/doctor-review/${consultation.id}`}>
                    <Button className="w-full sm:w-auto font-semibold bg-indigo-600 hover:bg-indigo-700 group-hover:shadow-md transition-all">
                      {consultation.status === 'pending' ? 'Review Intake' : 'View Record'}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500">
              <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No consultations found</h3>
              <p>Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}