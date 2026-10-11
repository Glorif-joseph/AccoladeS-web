"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MdHome } from "react-icons/md";
import { createClient } from "@/lib/supabase/client";

// Icône « maison » (page Produits) de la barre turquoise, avec un badge rouge
// comme celui des messages et des notifications : nombre de produits publiés
// par d'autres membres depuis ta dernière visite de la page Produits
// (colonne derniere_visite_produits, mise à jour à chaque visite de la page).
export default function ProduitsBadgeIcon({
  utilisateurId,
  nouveauxInitial,
  className = "text-white/[0.85] hover:text-white",
}: {
  utilisateurId: string;
  nouveauxInitial: number;
  className?: string;
}) {
  const [nouveaux, setNouveaux] = useState(nouveauxInitial);

  // Quand tu es sur la page Produits, tu vois les publications arriver :
  // elles ne doivent pas faire monter le badge.
  const pathname = usePathname();
  const surProduits = useRef(false);
  surProduits.current = pathname === "/produits";

  useEffect(() => {
    const supabase = createClient();

    async function rafraichir() {
      if (surProduits.current) {
        setNouveaux(0);
        return;
      }

      const { data: profil } = await supabase
        .from("profiles")
        .select("derniere_visite_produits")
        .eq("id", utilisateurId)
        .single();

      const depuis = profil?.derniere_visite_produits ?? "1970-01-01T00:00:00Z";
      const { count } = await supabase
        .from("produits")
        .select("id", { count: "exact", head: true })
        .gt("date_publication", depuis)
        .neq("profile_id", utilisateurId);

      setNouveaux(count ?? 0);
    }

    const channel = supabase
      .channel(`produits-badge-${utilisateurId}`)
      // Un autre membre publie un produit.
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "produits",
          filter: `profile_id=neq.${utilisateurId}`,
        },
        async () => {
          if (surProduits.current) {
            // Tu es sur la page : on avance la date de dernière visite pour
            // que ce produit ne soit pas compté en la quittant.
            await supabase
              .from("profiles")
              .update({ derniere_visite_produits: new Date().toISOString() })
              .eq("id", utilisateurId);
            return;
          }
          rafraichir();
        }
      )
      // Un produit supprimé baisse le compteur (pas de filtre possible ici).
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "produits" }, rafraichir)
      .subscribe();

    // Filet de sécurité : on recompte aussi quand l'onglet redevient visible.
    function auRetour() {
      if (document.visibilityState === "visible") rafraichir();
    }
    document.addEventListener("visibilitychange", auRetour);

    return () => {
      document.removeEventListener("visibilitychange", auRetour);
      supabase.removeChannel(channel);
    };
  }, [utilisateurId]);

  return (
    <Link
      href="/produits"
      className={`relative inline-flex items-center transition-colors ${className}`}
      aria-label={
        nouveaux > 0 ? `Produits, ${nouveaux} nouvelles publications` : "Produits"
      }
    >
      <MdHome size={20} aria-hidden="true" />
      {nouveaux > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[1.1rem] h-[1.1rem] rounded-full bg-danger text-[10px] leading-[1.1rem] text-white text-center px-1 font-bold">
          {nouveaux > 9 ? "9+" : nouveaux}
        </span>
      )}
    </Link>
  );
}
