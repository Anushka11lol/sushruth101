import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CameraCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void | Promise<void>;
  title?: string;
};

export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
  title = "Take a photo",
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"requesting" | "ready" | "denied">("requesting");
  const [capturing, setCapturing] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    stopCamera();
    setStatus("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ready");
    } catch {
      stopCamera();
      setStatus("denied");
    }
  };

  useEffect(() => {
    if (open) void startCamera();
    else stopCamera();
    return stopCamera;
  }, [open]);

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) return;
      const file = new File([blob], `camera-photo-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      await onCapture(file);
      onOpenChange(false);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Allow camera access, position the document clearly, then capture the photo.</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-contain ${status === "ready" ? "block" : "hidden"}`}
            aria-label="Live camera preview"
          />
          {status === "requesting" && (
            <div className="absolute inset-0 grid place-items-center text-white">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">Waiting for camera permission…</p>
              </div>
            </div>
          )}
          {status === "denied" && (
            <div className="absolute inset-0 grid place-items-center p-5">
              <Alert variant="destructive" className="max-w-md bg-white">
                <Camera className="h-4 w-4" />
                <AlertTitle>Camera access blocked</AlertTitle>
                <AlertDescription>
                  Allow camera access using the camera or lock icon in your browser’s address bar, then try again.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:space-x-0">
          {status === "denied" && (
            <Button type="button" variant="outline" onClick={() => void startCamera()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button
            type="button"
            data-testid="button-capture-camera-photo"
            onClick={() => void capturePhoto()}
            disabled={status !== "ready" || capturing}
          >
            {capturing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {capturing ? "Using photo…" : "Capture Photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}