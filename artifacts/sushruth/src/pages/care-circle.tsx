import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CareCircleMember,
  useListCareCircleMembers,
  useRemoveCareCircleMember,
  useListCareCircleAlerts,
  useGetSushruthIdentity,
  useListCareCircleConnectionRequests,
  useCreateCareCircleConnectionRequest,
  useRespondToCareCircleConnectionRequest,
  getListCareCircleMembersQueryKey,
  getListCareCircleConnectionRequestsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Trash2,
  Phone,
  Bell,
  AlertTriangle,
  Info,
  Shield,
  Heart,
  CheckCircle2,
  ChevronRight,
  Copy,
  XCircle,
} from "lucide-react";
import { MemberWorkspace } from "@/components/care-circle/MemberWorkspace";

const RELATIONSHIPS = [
  "Parent", "Spouse", "Child", "Sibling", "Grandparent", "Grandchild",
  "Uncle/Aunt", "Friend", "Caregiver", "Other",
];

const SEVERITY_CONFIG: Record<string, { class: string; icon: React.ElementType; borderClass: string }> = {
  info: { class: "bg-blue-50 text-blue-800 border-blue-200", icon: Info, borderClass: "border-l-blue-400" },
  warning: { class: "bg-amber-50 text-amber-800 border-amber-200", icon: AlertTriangle, borderClass: "border-l-amber-500" },
  critical: { class: "bg-red-50 text-red-800 border-red-200", icon: Shield, borderClass: "border-l-red-600" },
};

export default function CareCirclePage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const [activeMember, setActiveMember] = useState<CareCircleMember | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sushruthId: "",
    relationship: "",
  });
  const [requestError, setRequestError] = useState("");
  const [idCopied, setIdCopied] = useState(false);

  const { data: members, isLoading: membersLoading } = useListCareCircleMembers(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const { data: alerts, isLoading: alertsLoading } = useListCareCircleAlerts(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const { data: identity } = useGetSushruthIdentity(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const { data: connectionRequests } = useListCareCircleConnectionRequests(
    { userId }, { query: { enabled: !!userId } as any },
  );

  const createRequest = useCreateCareCircleConnectionRequest();
  const respondToRequest = useRespondToCareCircleConnectionRequest();
  const removeMember = useRemoveCareCircleMember();

  const handleAdd = async () => {
    if (!formData.sushruthId || !userId || !user) return;
    setRequestError("");
    try {
      await createRequest.mutateAsync({
        data: {
          userId,
          requesterName: user.fullName || "Sushruth patient",
          targetSushruthId: formData.sushruthId.trim().toUpperCase(),
          relationship: formData.relationship || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListCareCircleConnectionRequestsQueryKey({ userId }) });
      setShowForm(false);
      setFormData({ sushruthId: "", relationship: "" });
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to send connection request");
    }
  };

  const respond = async (id: number, action: "ACCEPT" | "REJECT", relationship?: string | null) => {
    if (!user) return;
    await respondToRequest.mutateAsync({
      id,
      data: {
        userId,
        recipientName: user.fullName || "Sushruth patient",
        action,
        relationship: relationship || null,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListCareCircleConnectionRequestsQueryKey({ userId }) });
    queryClient.invalidateQueries({ queryKey: getListCareCircleMembersQueryKey({ userId }) });
  };

  const handleRemove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Remove this member from your care circle?")) return;
    await removeMember.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListCareCircleMembersQueryKey({ userId }) });
  };

  const unreadAlerts = alerts?.filter((a) => !a.isRead) ?? [];
  const readAlerts = alerts?.filter((a) => a.isRead) ?? [];

  if (activeMember) {
    return <MemberWorkspace userId={userId} member={activeMember} onBack={() => setActiveMember(null)} />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Care Circle</h1>
          <p className="text-muted-foreground mt-1">Coordinate care with family, nurses, and elders.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-teal-600 hover:bg-teal-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <Card className="border-teal-200 bg-teal-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Sushruth ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-2xl font-bold tracking-wider text-teal-800" data-testid="text-sushruth-id">
              {identity?.sushruthId ?? "Loading…"}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={!identity?.sushruthId}
              data-testid="button-copy-sushruth-id"
              onClick={async () => {
                if (!identity?.sushruthId) return;
                await navigator.clipboard.writeText(identity.sushruthId);
                setIdCopied(true);
                setTimeout(() => setIdCopied(false), 2000);
              }}
            >
              {idCopied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {idCopied ? "Copied" : "Copy Sushruth ID"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Share this permanent ID only with people you trust. It can request a Care Circle connection but cannot open medical records.
          </p>
        </CardContent>
      </Card>

      {connectionRequests?.some((request) => request.direction === "INCOMING" && request.status === "PENDING") && (
        <Card className="border-blue-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-blue-700" />
              Pending connection requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectionRequests.filter((request) => request.direction === "INCOMING" && request.status === "PENDING").map((request) => (
              <div key={request.id} className="rounded-lg border p-3" data-testid={`card-incoming-request-${request.id}`}>
                <p className="font-medium">{request.requesterName}</p>
                <p className="text-sm text-muted-foreground">
                  Someone wants to connect with you through Sushruth Care Circle.
                  {request.relationship ? ` Suggested relationship: ${request.relationship}.` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => respond(request.id, "ACCEPT", request.relationship)} data-testid={`button-accept-request-${request.id}`}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => respond(request.id, "REJECT")} data-testid={`button-reject-request-${request.id}`}>
                    <XCircle className="mr-2 h-4 w-4" />Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {connectionRequests?.some((request) => request.direction === "OUTGOING") && (
        <Card>
          <CardHeader><CardTitle className="text-base">Sent requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {connectionRequests.filter((request) => request.direction === "OUTGOING").slice(0, 5).map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                <span>{request.recipientName || "Sushruth user"}</span>
                <Badge variant="outline">{request.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {alertsLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : unreadAlerts.length > 0 ? (
        <Card className="border-amber-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <Bell className="h-4 w-4" />
              Active Alerts ({unreadAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreadAlerts.map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
              const AlertIcon = cfg.icon;
              return (
                <div key={alert.id} className={`border-l-4 rounded-r-lg p-3 ${cfg.borderClass} ${cfg.class}`}>
                  <div className="flex items-start gap-2">
                    <AlertIcon className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{alert.memberName}</p>
                      <p className="text-sm mt-0.5">{alert.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(alert.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs shrink-0">
                      {alert.alertType.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-300">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">All clear! No active alerts for your care circle.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-600" />
            Care Circle Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !members || members.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Build your team. Add elders to manage their care, or add family members and caretakers to assign duties.
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-teal-600 hover:bg-teal-700">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Your First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-4 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => setActiveMember(m)}
                >
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0 text-lg">
                    {m.memberName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-base">{m.memberName}</p>
                      <Badge variant="secondary" className="text-xs">{m.relationship}</Badge>
                      {m.careRole && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-teal-700 border-teal-200 bg-teal-50/50">
                          {m.careRole.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {m.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {m.phone}
                        </p>
                      )}
                      {m.healthStatus && (
                        <p className="text-xs text-rose-500/80 font-medium">
                          {m.healthStatus}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={(e) => handleRemove(e, m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {readAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Past Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readAlerts.slice(0, 5).map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
              const AlertIcon = cfg.icon;
              return (
                <div key={alert.id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 opacity-70">
                  <AlertIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{alert.memberName}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect with Sushruth ID</DialogTitle>
            <DialogDescription>
              Enter the other person's public Sushruth ID. They must accept before the Care Circle connection becomes active.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="care-circle-sushruth-id">Sushruth ID</Label>
              <Input
                id="care-circle-sushruth-id"
                className="mt-1 font-mono uppercase"
                placeholder="SUS-7K4P92"
                maxLength={10}
                value={formData.sushruthId}
                onChange={(e) => setFormData((p) => ({ ...p, sushruthId: e.target.value.toUpperCase() }))}
                data-testid="input-care-circle-sushruth-id"
              />
              <p className="mt-1 text-xs text-muted-foreground">A request is sent first. Access starts only after the other person accepts.</p>
            </div>
            <div>
              <Label>Relationship</Label>
              <Select value={formData.relationship} onValueChange={(v) => setFormData((p) => ({ ...p, relationship: v }))}>
                <SelectTrigger className="mt-1" data-testid="select-connection-relationship">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {requestError && <p className="text-sm text-destructive" role="alert">{requestError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!/^SUS-[2-9A-HJ-NP-Z]{6}$/.test(formData.sushruthId) || createRequest.isPending} data-testid="button-send-connection-request">
              {createRequest.isPending ? "Sending..." : "Send Connection Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
