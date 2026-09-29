"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MdNotifications } from "react-icons/md";
import { createClient } from "@/lib/supabase/client";

export default function NotificationBell({
  utilisateurId,
  nonLuesInitial,
  className = "text-white/90 hover:text-white",
}: {
  utilisateurId: string;
  nonLuesInitial: number;
  className?: string;
}) {
  const [nonLues, setNonLues] = useState(nonLuesInitial);

  useEffect(() => {
    const supabase = createClient();

    async function rafraichir() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", utilisateurId)
        .eq("lu", false);

      if (typeof count === "number") setNonLues(count);
    }

    // `notifications` est maintenant dans la publication supabase_realtime
    // (migration confirmée) : on écoute directement les INSERT/UPDATE de ce
    // membre plutôt que de sonder à intervalle régulier. On refait un petit
    // COUNT à chaque événement plutôt que d'incrémenter/décrémenter
    // localement — plus simple et fiable qu'un calcul optimiste, et
    // toujours bien moins coûteux qu'un sondage périodique.
    const channel = supabase
      .channel(`notifications-${utilisateurId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${utilisateurId}`,
        },
        rafraichir
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [utilisateurId]);

  return (
    <Link
      href="/compte/notifications"
      className={`relative inline-flex items-center transition-colors ${className}`}
      aria-label={
        nonLues > 0 ? `Notifications, ${nonLues} non lues` : "Notifications"
      }
    >
      <MdNotifications size={22} aria-hidden="true" />
      {nonLues > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[1.1rem] h-[1.1rem] rounded-full bg-danger text-[10px] leading-[1.1rem] text-white text-center px-1 font-bold">
          {nonLues > 9 ? "9+" : nonLues}
        </span>
      )}
    </Link>
  );
}
