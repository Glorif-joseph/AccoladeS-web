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
  date_publication?: string | null;
  profiles: {
    pseudo: string;
    statut_actuel: string;
    photo_url: string | null;
  } | null;
  nb_likes: number;
  nb_commentaires: number;
  aime: boolean;
};

// Date d'une publication, comme sur Facebook : « À l'instant », « 5 min »,
// « 2 h », « Hier », « 3 j », puis « 12 octobre » (avec l'année si elle
// n'est pas l'année en cours).
function tempsRelatif(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const secondes = Math.floor((Date.now() - date.getTime()) / 1000);

  if (secondes < 60) return "À l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours === 1) return "Hier";
  if (jours < 7) return `${jours} j`;

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  });
}

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

      {/* Fil d'actualité : une seule colonne de publications, comme Facebook
          (pleine largeur sur téléphone, 680 px maximum sur grand écran). */}
      <div className="w-full max-w-[680px] mx-auto space-y-3">
        {filtres.map((produit) => {
          const estBloque =
            produit.bloque_jusqu_a && new Date(produit.bloque_jusqu_a) > new Date();
          const peutAcheter = produit.profile_id !== utilisateurId && !estBloque;
          const pseudo = produit.profiles?.pseudo ?? "Membre";

          return (
            <article
              key={produit.id}
              className="bg-paper rounded-xl shadow-sm border border-surface-border overflow-hidden"
            >
              {/* En-tête : avatar, nom, date */}
              <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5">
                <Link href={`/membres/${produit.profile_id}`} className="shrink-0">
                  {produit.profiles?.photo_url ? (
                    <Image
                      src={produit.profiles.photo_url}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-anthracite flex items-center justify-center text-accent text-sm font-bold">
                      {pseudo.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/membres/${produit.profile_id}`}
                    className="block text-[15px] font-semibold leading-tight truncate hover:underline"
                  >
                    {pseudo}
                  </Link>
                  <p className="text-[13px] text-muted leading-tight mt-0.5">
                    {tempsRelatif(produit.date_publication)}
                    {produit.date_publication ? " · " : ""}
                    <span aria-hidden="true">🌐</span>
                  </p>
                </div>

                <PalierBadge statut={produit.profiles?.statut_actuel ?? "Nouveau"} />
              </div>

              {/* Texte de la publication */}
              {produit.description && (
                <Link href={`/produits/${produit.id}`} className="block px-4 pb-3">
                  <p className="text-[15px] leading-snug whitespace-pre-wrap break-words line-clamp-4">
                    {produit.description}
                  </p>
                </Link>
              )}

              {/* Image pleine largeur, à ses proportions */}
              {produit.image_url && (
                <Link href={`/produits/${produit.id}`} className="block relative bg-surface">
                  <Image
                    src={produit.image_url}
                    alt={produit.titre}
                    width={680}
                    height={680}
                    sizes="(min-width: 680px) 680px, 100vw"
                    className="w-full h-auto max-h-[620px] object-cover"
                  />
                  {estBloque && (
                    <span className="absolute top-3 right-3 bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      Indisponible
                    </span>
                  )}
                </Link>
              )}

              {/* Bandeau du produit, avec le bouton boutique / achat
                  (comme l'aperçu de lien d'une publication Facebook) */}
              <div className="bg-[#f0f2f5] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
                <Link href={`/produits/${produit.id}`} className="flex-1 min-w-0">
                  <p className="text-xs text-muted">Produit digital · {produit.prix} $</p>
                  <p className="text-[15px] font-semibold leading-snug truncate">
                    {produit.titre}
                  </p>
                  {!produit.image_url && estBloque && (
                    <p className="text-xs font-bold text-danger mt-0.5">Indisponible</p>
                  )}
                </Link>

                {peutAcheter && (
                  <button
                    onClick={() => acheterProduit(produit)}
                    className="shrink-0 bg-gris-fonce text-paper font-semibold text-sm rounded-lg px-4 py-2.5"
                  >
                    Voir la boutique / Acheter
                  </button>
                )}
              </div>

              {/* Compteurs : j'aime à gauche, commentaires à droite */}
              {(produit.nb_likes > 0 || produit.nb_commentaires > 0) && (
                <div className="flex items-center justify-between px-4 py-2.5 text-[15px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    {produit.nb_likes > 0 && (
                      <>
                        <span
                          aria-hidden="true"
                          className="w-[18px] h-[18px] rounded-full bg-accent text-[10px] flex items-center justify-center"
                        >
                          👍
                        </span>
                        {produit.nb_likes}
                      </>
                    )}
                  </span>
                  {produit.nb_commentaires > 0 && (
                    <button
                      onClick={() => setProduitOuvert(produit.id)}
                      className="hover:underline"
                    >
                      {produit.nb_commentaires} commentaire
                      {produit.nb_commentaires > 1 ? "s" : ""}
                    </button>
                  )}
                </div>
              )}

              {/* Actions : J'aime, Commenter, Partager */}
              <div className="mx-4 mb-1 pt-1 border-t border-surface-border flex items-center">
                <button
                  onClick={() => basculerLike(produit.id)}
                  aria-pressed={produit.aime}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 my-1 rounded-lg text-[15px] font-semibold hover:bg-black/5 transition-colors ${
                    produit.aime ? "text-accent-ink" : "text-muted"
                  }`}
                >
                  <span aria-hidden="true" className={produit.aime ? "" : "grayscale opacity-70"}>
                    👍
                  </span>
                  J&rsquo;aime
                </button>
                <button
                  onClick={() => setProduitOuvert(produit.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 my-1 rounded-lg text-[15px] font-semibold text-muted hover:bg-black/5 transition-colors"
                >
                  <span aria-hidden="true" className="grayscale opacity-70">
                    💬
                  </span>
                  Commenter
                </button>
                <button
                  onClick={() => partager(produit)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 my-1 rounded-lg text-[15px] font-semibold text-muted hover:bg-black/5 transition-colors"
                >
                  <span aria-hidden="true" className="grayscale opacity-70">
                    ↗️
                  </span>
                  Partager
                </button>
              </div>
            </article>
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
