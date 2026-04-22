import { supabase } from "@/integrations/supabase/client";
import { extractMentions } from "@/components/RichText";

/**
 * Inserta filas en `mentions` para cada @username detectado.
 * El trigger SQL `notify_mention` se encarga de crear la notificación.
 */
export async function recordMentions(opts: {
  text: string;
  sourceType: "video" | "comment" | "post" | "post_comment";
  sourceId: string;
  sourceUserId: string;
}) {
  const usernames = extractMentions(opts.text);
  if (!usernames.length) return;
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", usernames);
  const rows = (profs ?? [])
    .filter((p: any) => p.id !== opts.sourceUserId)
    .map((p: any) => ({
      mentioned_user_id: p.id,
      source_type: opts.sourceType,
      source_id: opts.sourceId,
      source_user_id: opts.sourceUserId,
    }));
  if (!rows.length) return;
  await supabase.from("mentions").insert(rows);
}
