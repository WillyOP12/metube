import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  file: File | null;
  aspect: number;          // p.ej. 1 (avatar), 16/9 (thumb), 4 (banner ~1920x480)
  cropShape?: "rect" | "round";
  outputMaxWidth?: number; // px de salida
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cropped: File) => void;
  title?: string;
}

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });

async function getCroppedFile(srcUrl: string, area: Area, maxW: number, fileName: string): Promise<File> {
  const img = await createImage(srcUrl);
  const scale = Math.min(1, maxW / area.width);
  const outW = Math.round(area.width * scale);
  const outH = Math.round(area.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
  return new Promise<File>((resolve) =>
    canvas.toBlob((blob) => {
      if (!blob) throw new Error("crop failed");
      resolve(new File([blob], fileName, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9),
  );
}

export const ImageCropper = ({
  file, aspect, cropShape = "rect", outputMaxWidth = 1280,
  open, onOpenChange, onConfirm, title = "Recortar imagen",
}: Props) => {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setSrc(null); return; }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onComplete = useCallback((_a: Area, px: Area) => setAreaPx(px), []);

  const confirm = async () => {
    if (!src || !areaPx || !file) return;
    setBusy(true);
    try {
      const cropped = await getCroppedFile(src, areaPx, outputMaxWidth, file.name.replace(/\.[^.]+$/, ".jpg"));
      onConfirm(cropped);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Ajusta el encuadre y el zoom y confirma.</DialogDescription>
        </DialogHeader>
        <div className="relative w-full h-[360px] bg-surface-2 rounded-lg overflow-hidden">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
            />
          )}
        </div>
        <div className="px-1">
          <p className="text-xs text-muted-foreground mb-2">Zoom</p>
          <Slider min={1} max={4} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={busy || !areaPx}>{busy ? "Procesando..." : "Confirmar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
