import { useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  file: File | null;
  aspect: number;
  cropShape?: "rect" | "round";
  outputMaxWidth?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cropped: File) => void;
  title?: string;
}

const centerAspect = (mediaW: number, mediaH: number, aspect: number): Crop =>
  centerCrop(makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaW, mediaH), mediaW, mediaH);

async function getCroppedFile(image: HTMLImageElement, crop: PixelCrop, maxW: number, name: string, round: boolean): Promise<File> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const sw = crop.width * scaleX;
  const sh = crop.height * scaleY;
  const scale = Math.min(1, maxW / sw);
  const outW = Math.round(sw * scale);
  const outH = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  if (round) {
    ctx.beginPath();
    ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, sw, sh, 0, 0, outW, outH);
  return new Promise<File>((resolve) =>
    canvas.toBlob((blob) => {
      if (!blob) throw new Error("crop failed");
      resolve(new File([blob], name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
    }, "image/jpeg", 0.92),
  );
}

export const ImageCropper = ({
  file, aspect, cropShape = "rect", outputMaxWidth = 1280,
  open, onOpenChange, onConfirm, title = "Recortar imagen",
}: Props) => {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!file) { setSrc(null); return; }
    const url = URL.createObjectURL(file);
    setSrc(url); setCompleted(null); setCrop(undefined);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspect(width, height, aspect));
  };

  const confirm = async () => {
    if (!imgRef.current || !completed || !file) return;
    setBusy(true);
    try {
      const cropped = await getCroppedFile(imgRef.current, completed, outputMaxWidth, file.name, cropShape === "round");
      onConfirm(cropped);
      onOpenChange(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Arrastra las esquinas para ajustar el encuadre.</DialogDescription>
        </DialogHeader>
        <div className="bg-surface-2 rounded-lg overflow-auto max-h-[60vh] flex items-center justify-center p-2">
          {src && (
            <ReactCrop
              crop={crop}
              onChange={(_, pc) => setCrop(pc)}
              onComplete={(c) => setCompleted(c)}
              aspect={aspect}
              circularCrop={cropShape === "round"}
              keepSelection
            >
              <img ref={imgRef} src={src} alt="recortar" onLoad={onLoad} className="max-h-[55vh] max-w-full" />
            </ReactCrop>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={busy || !completed}>{busy ? "Procesando..." : "Confirmar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
