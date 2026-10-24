import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CareCircleMember,
  useListCareCircleIdentityVerifications,
  useCreateCareCircleIdentityVerification,
  useListCareCircleVaultItems,
  getListCareCircleIdentityVerificationsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Info, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ID_DOC_TYPES = ["Aadhaar", "PAN Card", "Voter ID", "Passport", "Driving License"];

export function MemberIdentity({ userId, member }: { userId: string; member: CareCircleMember }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    legalName: "",
    documentType: "",
    documentLast4: "",
    documentVaultItemId: "",
  });

  const { data: verifications, isLoading } = useListCareCircleIdentityVerifications(
    { userId },
    { query: { enabled: !!userId } as any }
  );

  const memberVerifications = verifications?.filter(v => v.memberId === member.id) || [];

  const { data: vaultItems } = useListCareCircleVaultItems(
    { userId, memberId: member.id },
    { query: { enabled: !!userId && !!member.id } as any }
  );

  const createVerification = useCreateCareCircleIdentityVerification();

  const handleSubmit = async () => {
    if (!formData.legalName || !formData.documentType || formData.documentLast4.length !== 4 || !formData.documentVaultItemId) {
      return;
    }

    try {
      await createVerification.mutateAsync({
        data: {
          userId,
          memberId: member.id,
          legalName: formData.legalName,
          documentType: formData.documentType,
          documentLast4: formData.documentLast4,
          documentVaultItemId: parseInt(formData.documentVaultItemId),
        }
      });
      queryClient.invalidateQueries({ queryKey: getListCareCircleIdentityVerificationsQueryKey({ userId }) });
      setOpen(false);
      setFormData({ legalName: "", documentType: "", documentLast4: "", documentVaultItemId: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusConfig = (status: string) => {
    if (status === "approved") return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Approved" };
    if (status === "rejected") return { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Rejected" };
    return { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Pending Review" };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Identity Verification
          </h3>
          <p className="text-sm text-muted-foreground">Verify identity for legal accountability.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          Submit Identity
        </Button>
      </div>

      <Alert className="bg-indigo-50/50 border-indigo-100 text-indigo-800 pb-3">
        <Info className="h-4 w-4 text-indigo-600 mt-0.5" />
        <AlertTitle className="text-sm font-semibold">Accountability</AlertTitle>
        <AlertDescription className="text-xs leading-relaxed mt-1 text-indigo-700/80">
          Sushruth promotes dignified care. By verifying the identity of home nurses or caretakers, we establish clear accountability. We do not claim automated government verification. Submissions are reviewed manually for clarity and validity.
        </AlertDescription>
      </Alert>

      {memberVerifications.length > 0 && (
        <div className="space-y-3">
          {memberVerifications.map(v => {
            const cfg = getStatusConfig(v.status);
            const StatusIcon = cfg.icon;
            return (
              <Card key={v.id} className={`overflow-hidden border ${v.status === 'approved' ? 'border-green-200' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm">{v.legalName}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.documentType} ending in •••• {v.documentLast4}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Submitted: {new Date(v.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-none flex items-center gap-1.5`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                  {v.reviewNotes && (
                    <div className="mt-3 text-xs bg-muted/50 p-2 rounded border border-border">
                      <span className="font-semibold">Review note: </span>
                      {v.reviewNotes}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Identity for Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="py-2.5 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-xs text-amber-800">Manual Review Process</AlertTitle>
              <AlertDescription className="text-[10px] text-amber-700/80 leading-tight">
                For privacy, we never ask for your full ID number. Provide only the last 4 digits. The uploaded document from your Vault will be reviewed manually to verify the name and document type.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Full Legal Name</Label>
              <Input 
                className="mt-1" 
                placeholder="As it appears on the document" 
                value={formData.legalName}
                onChange={e => setFormData(p => ({ ...p, legalName: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Document Type</Label>
                <Select value={formData.documentType} onValueChange={v => setFormData(p => ({ ...p, documentType: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Last 4 Digits</Label>
                <Input 
                  className="mt-1 font-mono" 
                  placeholder="1234" 
                  maxLength={4}
                  value={formData.documentLast4}
                  onChange={e => setFormData(p => ({ ...p, documentLast4: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
            </div>

            <div>
              <Label>Source Document (from Vault)</Label>
              <Select value={formData.documentVaultItemId} onValueChange={v => setFormData(p => ({ ...p, documentVaultItemId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {vaultItems?.length === 0 && (
                    <SelectItem value="none" disabled>No documents found in vault</SelectItem>
                  )}
                  {vaultItems?.map(item => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.title} ({item.documentType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                You must upload the document to the member's Vault first.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.legalName || !formData.documentType || formData.documentLast4.length !== 4 || !formData.documentVaultItemId || createVerification.isPending}
            >
              {createVerification.isPending ? "Submitting..." : "Submit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
