import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CareCircleMember,
  useListCareCircleVaultItems,
  useCreateCareCircleVaultItem,
  useRequestCareCircleVaultUploadUrl,
  useDeleteCareCircleVaultItem,
  getCareCircleVaultDownloadUrl,
  getListCareCircleVaultItemsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Trash2, Plus, Lock, UploadCloud, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DOC_TYPES = ["Medical Record", "Prescription", "Identity Document", "Insurance", "Legal", "Other"];

export function MemberVault({ userId, member }: { userId: string; member: CareCircleMember }) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    documentType: "",
  });

  const { data: items, isLoading } = useListCareCircleVaultItems(
    { userId, memberId: member.id },
    { query: { enabled: !!userId && !!member.id } as any }
  );

  const requestUrl = useRequestCareCircleVaultUploadUrl();
  const createItem = useCreateCareCircleVaultItem();
  const deleteItem = useDeleteCareCircleVaultItem();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a file.");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be less than 10MB.");
      return;
    }

    if (!formData.title || !formData.documentType) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setUploading(true);
      const urlRes = await requestUrl.mutateAsync({
        data: {
          userId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size
        }
      });

      // PUT file
      const putRes = await fetch(urlRes.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error("Failed to upload file to storage.");

      await createItem.mutateAsync({
        data: {
          userId,
          memberId: member.id,
          title: formData.title,
          documentType: formData.documentType,
          fileName: file.name,
          objectPath: urlRes.objectPath,
          contentType: file.type,
          fileSize: file.size,
        }
      });

      queryClient.invalidateQueries({ queryKey: getListCareCircleVaultItemsQueryKey({ userId, memberId: member.id }) });
      setUploadOpen(false);
      setFormData({ title: "", documentType: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteItem.mutateAsync({ id, params: { userId } });
      queryClient.invalidateQueries({ queryKey: getListCareCircleVaultItemsQueryKey({ userId, memberId: member.id }) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await getCareCircleVaultDownloadUrl(id, { userId });
      window.open(res.downloadURL, "_blank");
    } catch (err) {
      console.error(err);
      alert("Failed to get download link");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Lock className="h-5 w-5 text-teal-600" />
            Private Document Vault
          </h3>
          <p className="text-sm text-muted-foreground">Securely store medical and legal documents.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : items?.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">No documents stored yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Upload identity documents, past medical records, or legal directives. Files are private and opened through short-lived access links.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items?.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate">{item.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{item.documentType} &bull; {(item.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Uploaded {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleDownload(item.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={(open) => !uploading && setUploadOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs">{error}</AlertTitle>
              </Alert>
            )}
            <div>
              <Label>Document Title</Label>
              <Input 
                className="mt-1" 
                placeholder="e.g. Discharge Summary 2023" 
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                disabled={uploading}
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select disabled={uploading} value={formData.documentType} onValueChange={v => setFormData(p => ({ ...p, documentType: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File (PDF/JPG/PNG/WebP, up to 10MB)</Label>
              <Input 
                type="file" 
                ref={fileInputRef}
                className="mt-1 cursor-pointer" 
                accept=".pdf,image/jpeg,image/png,image/webp"
                disabled={uploading}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
              <Button type="submit" disabled={uploading || !formData.title || !formData.documentType}>
                {uploading ? "Uploading..." : "Save to Vault"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
