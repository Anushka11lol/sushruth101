import { CareCircleMember } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Phone, ShieldCheck, HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberCarePlan } from "./MemberCarePlan";
import { MemberVault } from "./MemberVault";
import { MemberIdentity } from "./MemberIdentity";

export function MemberWorkspace({ 
  userId, 
  member, 
  onBack 
}: { 
  userId: string; 
  member: CareCircleMember; 
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold truncate">{member.memberName}</h2>
            <Badge variant="secondary">{member.relationship}</Badge>
            {member.careRole && (
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 uppercase text-[10px]">
                {member.careRole.replace("_", " ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            {member.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {member.phone}
              </span>
            )}
            {member.healthStatus && (
              <span className="flex items-center gap-1">
                <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> {member.healthStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="care-plan" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
          <TabsTrigger 
            value="care-plan" 
            data-sr-description="Care plan and logs — opens assigned duties and daily care records."
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 bg-transparent"
          >
            Care Plan & Logs
          </TabsTrigger>
          <TabsTrigger 
            value="vault" 
            data-sr-description="Document vault — opens this family member's private health documents."
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 bg-transparent"
          >
            Document Vault
          </TabsTrigger>
          <TabsTrigger 
            value="identity" 
            data-sr-description="Identity verification — opens manual identity details and verification status."
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 bg-transparent"
          >
            Identity Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="care-plan" className="mt-0">
          <MemberCarePlan userId={userId} member={member} />
        </TabsContent>
        
        <TabsContent value="vault" className="mt-0">
          <MemberVault userId={userId} member={member} />
        </TabsContent>
        
        <TabsContent value="identity" className="mt-0">
          <MemberIdentity userId={userId} member={member} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
