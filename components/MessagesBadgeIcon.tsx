"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MdMessage } from "react-icons/md";
import { createClient } from "@/lib/supabase/client";

export default function MessagesBadgeIcon({
  utilisateurId,
  nonLusInitial,
  className = "text-white/90 hover:text-white",
}: {
  utilisateurId: string;
  nonLusInitial: number;
  className?: string;
}) {
  const [nonLus, setNonLus] = useState(nonLusInitial);

  // Quand tu es dans le Salon, tu lis les messages en direct : ils ne doivent
  // pas faire monter le badge.
  const pathname = usePathname();
  const surSalon = useRef(false);
  surSalon.current = pathname?.startsWith("/salon") ?? false;

  useEffect(() => {
    const supabase = createClient();

    // Total = messages privés non lus + nouveaux messages du Salon depuis ta
    // dernière visite (hors les tiens). Même règle que SiteHeader et que la
    // page Messages.
    async function rafraichir() {
      const [{ count: prives }, { data: profil }] = await Promise.all([
        supabase
          .from("messages_prives")
          .select("id", { count: "exact", head: true })
          .eq("destinataire_id", utilisateurId)
          .eq("lu", false),
        supabase
          .from("profiles")
          .select("derniere_visite_salon")
          .eq("id", utilisateurId)
          .single(),
      ]);

      let salon = 0;
      if (!surSalon.current) {
        const depuis = profil?.derniere_visite_salon ?? "1970-01-01T00:00:00Z";
        const { count } = await supabase
          .from("messages_groupe")
          .select("id", { count: "exact", head: true })
          .gt("created_at", depuis)
          .neq("expediteur_id", utilisateurId);
        salon = count ?? 0;
      }

      setNonLus((prives ?? 0) + salon);
    }

    // messages_prives est dans la publication supabase_realtime depuis le
    // départ (contrairement à notifications, qui a dû y être ajoutée).
    const channel = supabase
      .channel(`messages-badge-${utilisateurId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages_prives",
          filter: `destinataire_id=eq.${utilisateurId}`,
        },
        rafraichir
      )
      // Nouveau message dans le Salon (écrit par quelqu'un d'autre).
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_groupe",
          filter: `expediteur_id=neq.${utilisateurId}`,
        },
        async () => {
          if (surSalon.current) {
            // Tu es dans le Salon : le message est lu en direct, on avance
            // la date de dernière visite pour qu'il ne soit pas compté
            // comme non lu en quittant la page.
            await supabase
              .from("profiles")
              .update({ derniere_visite_salon: new Date().toISOString() })
              .eq("id", utilisateurId);
            return;
          }
          rafraichir();
        }
      )
      // Un message du Salon supprimé doit aussi baisser le compteur
      // (Supabase n'accepte pas de filtre sur les suppressions).
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages_groupe" },
        rafraichir
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [utilisateurId]);

  return (
    <Link
      href="/compte/messages"
      className={`relative inline-flex items-center transition-colors ${className}`}
      aria-label={nonLus > 0 ? `Messages, ${nonLus} non lus` : "Messages"}
    >
      <MdMessage size={20} aria-hidden="true" />
      {nonLus > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[1.1rem] h-[1.1rem] rounded-full bg-danger text-[10px] leading-[1.1rem] text-white text-center px-1 font-bold">
          {nonLus > 9 ? "9+" : nonLus}
        </span>
      )}
    </Link>
  );
}
