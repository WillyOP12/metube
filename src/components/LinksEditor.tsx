import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { PLATFORM_META, PLATFORM_ORDER, type Platform, type RichLink, normalizeLinkUrl } from "@/lib/links";

interface Props {
  value: RichLink[];
  onChange: (next: RichLink[]) => void;
  max?: number;
}

export const LinksEditor = ({ value, onChange, max = 10 }: Props) => {
  const [platform, setPlatform] = useState<Platform>("website");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const add = () => {
    const u = normalizeLinkUrl(url);
    if (!u) return;
    const next = [...value, { platform, url: u, label: label.trim() || undefined }];
    onChange(next.slice(0, max));
    setUrl(""); setLabel("");
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((l, i) => {
            const Icon = PLATFORM_META[l.platform].icon;
            return (
              <div key={i} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 pl-3 pr-1 py-1 text-sm">
                <Icon className="h-3.5 w-3.5" />
                <span className="max-w-[200px] truncate">{l.label || PLATFORM_META[l.platform].label}</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_140px_auto] gap-2">
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger className="bg-surface-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORM_ORDER.map((p) => {
                const Icon = PLATFORM_META[p].icon;
                return (
                  <SelectItem key={p} value={p}>
                    <span className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{PLATFORM_META[p].label}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={PLATFORM_META[platform].placeholder}
            className="bg-surface-1"
          />
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
      <p className="text-xs text-muted-foreground">{value.length}/{max} enlaces</p>
    </div>
  );
};
