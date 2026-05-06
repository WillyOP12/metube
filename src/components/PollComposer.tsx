import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Plus } from "lucide-react";

export interface PollDraft {
  question: string;
  options: string[];
  multi_choice: boolean;
  closes_at: string | null;
}

export const PollComposer = ({
  draft, onChange, onRemove,
}: {
  draft: PollDraft;
  onChange: (d: PollDraft) => void;
  onRemove: () => void;
}) => {
  const [closesAt, setClosesAt] = useState(draft.closes_at ?? "");

  const setOption = (i: number, v: string) => {
    const next = [...draft.options];
    next[i] = v;
    onChange({ ...draft, options: next });
  };
  const addOption = () => {
    if (draft.options.length >= 10) return;
    onChange({ ...draft, options: [...draft.options, ""] });
  };
  const removeOption = (i: number) => {
    if (draft.options.length <= 2) return;
    onChange({ ...draft, options: draft.options.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Encuesta</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} type="button">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Input
        placeholder="Pregunta"
        value={draft.question}
        onChange={(e) => onChange({ ...draft, question: e.target.value.slice(0, 200) })}
        className="bg-background"
      />
      <div className="space-y-2">
        {draft.options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder={`Opción ${i + 1}`}
              value={opt}
              onChange={(e) => setOption(i, e.target.value.slice(0, 100))}
              className="bg-background"
            />
            {draft.options.length > 2 && (
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeOption(i)} type="button">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {draft.options.length < 10 && (
          <Button variant="outline" size="sm" onClick={addOption} type="button" className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Añadir opción
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="multi" className="text-sm flex items-center gap-2 cursor-pointer">
          <Switch
            id="multi"
            checked={draft.multi_choice}
            onCheckedChange={(v) => onChange({ ...draft, multi_choice: v })}
          />
          Selección múltiple
        </Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="closes" className="text-xs text-muted-foreground">Cierre (opcional)</Label>
        <Input
          id="closes"
          type="datetime-local"
          value={closesAt}
          onChange={(e) => {
            setClosesAt(e.target.value);
            onChange({ ...draft, closes_at: e.target.value || null });
          }}
          className="bg-background"
        />
      </div>
    </div>
  );
};
