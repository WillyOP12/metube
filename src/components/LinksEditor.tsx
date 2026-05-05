import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { PLATFORM_META, type RichLink, normalizeLinkUrl, detectPlatform } from "@/lib/links";

interface Props {
  value: RichLink[];
  onChange: (next: RichLink[]) => void;
  max?: number;
}

export const LinksEditor = ({ value, onChange, max = 10 }: Props) => {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const normalized = normalizeLinkUrl(url);
  const detected = normalized ? detectPlatform(normalized) : "website";
  const Preview = PLATFORM_META[detected];

  const add = () => {
    const u = normalizeLinkUrl(url);
    if (!u) return;
    const next = [...value, { platform: detected, url: u, label: label.trim() || undefined }];
    onChange(next.slice(0, max));
    setUrl(""); setLabel("");
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((l, i) => {
            const meta = PLATFORM_META[l.platform];
            const Icon = meta.icon;
            return (
              <div key={i} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 pl-1 pr-1 py-1 text-sm">
                <span className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: meta.brand, color: meta.fg }}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="max-w-[200px] truncate">{l.label || meta.label}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="h-5 w-5 rounded-full hover:bg-surface-3 flex items-center justify-center"
                  aria-label="Quitar"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {value.length < max && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: Preview.brand, color: Preview.fg }}>
              <Preview.icon className="h-3 w-3" />
            </span>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega cualquier URL (X, IG, YouTube, web...)"
              className="bg-surface-1 pl-10"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            />
          </div>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 30))}
            placeholder="Etiqueta (opcional)"
            className="bg-surface-1"
          />
          <Button type="button" onClick={add} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />Añadir
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Detección automática de plataforma · {value.length}/{max} enlaces</p>
    </div>
  );
};
