"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const supabase = createClient();

    async function rafraichir() {
      const { count } = await supabase
        .from("messages_prives")
        .select("id", { count: "exact", head: true })
        .eq("destinataire_id", utilisateurId)
        .eq("lu", false);

      if (typeof count === "number") setNonLus(count);
    }

    // messages_prives est dans la publication supabase_realtime depuis le
    // départ (contrairement à notifications, qui a dû y être ajoutée).
    const channel = supabase
      .channel(`messages-prives-${utilisateurId}`)
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
