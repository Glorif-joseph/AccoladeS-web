"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PalierBadge from "./PalierBadge";
import CommentairesModal from "./CommentairesModal";

type Produit = {
  id: string;
  titre: string;
  description: string;
  lien_boutique: string;
  prix: number;
  image_url: string | null;
  profile_id: string;
  bloque_jusqu_a: string | null;
  profiles: {
    pseudo: string;
    statut_actuel: string;
    photo_url: string | null;
  } | null;
  nb_likes: number;
  nb_commentaires: number;
  aime: boolean;
};

export default function ProduitsListe({
  produits: produitsInitial,
  utilisateurId,
  campagnesRangee,
}: {
  produits: Produit[];
  utilisateurId: string | null;
  campagnesRangee?: React.ReactNode;
}) {
  const [produits, setProduits] = useState(produitsInitial);
  const [recherche, setRecherche] = useState("");
  const [produitOuvert, setProduitOuvert] = useState<string | null>(null);

  const filtres = recherche.trim()
    ? produits.filter(
        (p) =>
          p.titre?.toLowerCase().includes(recherche.toLowerCase()) ||
          p.profiles?.pseudo?.toLowerCase().includes(recherche.toLowerCase())
      )
    : produits;

  async function basculerLike(produitId: string) {
    if (!utilisateurId) {
      alert("Connecte-toi pour aimer un produit.");
      return;
    }
    const supabase = createClient();
    const produit = produits.find((p) => p.id === produitId);
    if (!produit) return;
    const dejaAime = produit.aime;

    setProduits((prev) =>
      prev.map((p) =>
        p.id === produitId
          ? { ...p, aime: !dejaAime, nb_likes: p.nb_likes + (dejaAime ? -1 : 1) }
          : p
      )
    );

    if (dejaAime) {
      await supabase
        .from("likes")
        .delete()
        .eq("produit_id", produitId)
        .eq("utilisateur_id", utilisateurId);
    } else {
      await supabase
        .from("likes")
        .insert({ produit_id: produitId, utilisateur_id: utilisateurId });
    }
  }

  async function acheterProduit(produit: Produit) {
    if (!utilisateurId) {
      alert("Connecte-toi pour déclarer un achat.");
      return;
    }
    if (produit.profile_id === utilisateurId) {
      alert("Tu ne peux pas déclarer un achat sur ton propre produit.");
      return;
    }

    // aUnAbonnementActif()/alerterAbonnementRequis() (utils/abonnement.ts)
    // n'ont pas été partagés — reconstruit à partir du modèle déjà en place
    // sur /compte/abonnement : un abonnement "payé" pour le mois en cours.
    const supabase = createClient();
    const premierJourMois = new Date();
    premierJourMois.setDate(1);
    const moisCourant = premierJourMois.toISOString().slice(0, 10);

    const { data: abonnement } = await supabase
      .from("abonnements")
      .select("id")
      .eq("profile_id", utilisateurId)
      .eq("mois", moisCourant)
      .eq("statut", "payé")
      .maybeSingle();

    if (!abonnement) {
      if (
        confirm(
          "Un abonnement actif est requis pour acheter un produit. Aller à la page abonnement ?"
        )
      ) {
        window.location.href = "/compte/abonnement";
      }
      return;
    }

    window.open(produit.lien_boutique, "_blank", "noopener,noreferrer");

    // Contrairement à l'app, pas de déclaration de preuve liée à CE produit
    // précis ici : la vraie table `achats` n'a pas de colonne `produit_id`
    // (déjà documenté pour Validations/achats) — l'app insère donc sur une
    // colonne qui n'existe pas réellement. La déclaration se fait par mois,
    // via /compte/achats, qui utilise le vrai schéma.
    if (
      confirm(
        `As-tu bien acheté "${produit.titre}" ? Déclare ta preuve d'achat sur la page Mes achats.`
      )
    ) {
      window.location.href = "/compte/achats";
    }
  }

  async function partager(produit: Produit) {
    const message = `Découvre "${produit.titre}" par ${produit.profiles?.pseudo} — ${produit.lien_boutique}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        const supabase = createClient();
        await supabase.rpc("notifier_partage", { p_produit_id: produit.id });
      } catch {
        // partage annulé
      }
    } else {
      await navigator.clipboard.writeText(message);
      alert("Lien copié dans le presse-papier !");
    }
  }

  return (
    <>
      <input
        type="text"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un produit ou un vendeur..."
        autoCapitalize="none"
        className="w-full bg-surface border border-accent rounded-full px-4 py-2.5 text-sm mb-6 outline-none"
      />

      {campagnesRangee}

      {filtres.length === 0 && (
        <p className="text-center text-muted mt-10">Aucun produit pour le moment.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtres.map((produit) => {
          const estBloque =
            produit.bloque_jusqu_a && new Date(produit.bloque_jusqu_a) > new Date();

          return (
            <div
              key={produit.id}
              className="bg-paper border border-surface-border rounded-xl overflow-hidden"
            >
              <Link href={`/produits/${produit.id}`} className="block relative">
                {produit.image_url ? (
                  <Image
                    src={produit.image_url}
                    alt={produit.titre}
                    width={400}
                    height={225}
                    className="w-full h-[180px] object-cover bg-surface"
                  />
                ) : (
                  <div className="w-full h-[180px] bg-surface flex items-center justify-center text-muted text-sm">
                    Pas d&rsquo;image
                  </div>
                )}
                {estBloque && (
                  <span className="absolute top-3 right-3 bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                    Indisponible
                  </span>
                )}
              </Link>

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/membres/${produit.profile_id}`}
                    className="flex items-center gap-2 min-w-0"
                  >
                    {produit.profiles?.photo_url ? (
                      <Image
                        src={produit.profiles.photo_url}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-anthracite flex items-center justify-center text-accent text-xs font-bold shrink-0">
                        {produit.profiles?.pseudo?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-semibold truncate">
                      {produit.profiles?.pseudo}
                    </span>
                  </Link>
                  <PalierBadge statut={produit.profiles?.statut_actuel ?? "Nouveau"} />
                </div>

                <Link href={`/produits/${produit.id}`}>
                  <h2 className="font-bold text-[17px] leading-snug mb-1">
                    {produit.titre}
                  </h2>
                  <p className="text-sm text-ink/70 mb-2 line-clamp-2">
                    {produit.description}
                  </p>
                </Link>

                <span className="inline-block bg-accent text-accent-ink font-bold text-sm rounded-lg px-2.5 py-0.5 mb-3">
                  {produit.prix} $
                </span>

                {produit.profile_id !== utilisateurId && !estBloque && (
                  <button
                    onClick={() => acheterProduit(produit)}
                    className="block w-full text-center bg-gris-fonce text-paper font-semibold text-sm rounded-full py-2.5 mb-3"
                  >
                    Voir la boutique / Acheter
                  </button>
                )}

                <div className="flex items-center justify-between pt-2.5 border-t border-surface-border">
                  <button
                    onClick={() => basculerLike(produit.id)}
                    className="text-sm flex items-center gap-1"
                  >
                    <span>{produit.aime ? "❤️" : "🤍"}</span>
                    <span className={produit.aime ? "text-danger" : ""}>
                      {produit.nb_likes}
                    </span>
                  </button>
                  <button
                    onClick={() => setProduitOuvert(produit.id)}
                    className="text-sm"
                  >
                    💬 {produit.nb_commentaires}
                  </button>
                  <button onClick={() => partager(produit)} className="text-sm">
                    ↗️ Partager
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {produitOuvert && (
        <CommentairesModal
          produitId={produitOuvert}
          utilisateurId={utilisateurId}
          onFermer={() => setProduitOuvert(null)}
          onNouveauCommentaire={() =>
            setProduits((prev) =>
              prev.map((p) =>
                p.id === produitOuvert
                  ? { ...p, nb_commentaires: p.nb_commentaires + 1 }
                  : p
              )
            )
          }
        />
      )}
    </>
  );
}
