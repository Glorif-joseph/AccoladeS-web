"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Même règle que l'app (videoMaxDuration: 30). Sur le web on ne peut pas
// découper la vidéo, donc on refuse celles qui dépassent.
const DUREE_VIDEO_MAX = 30;

type Media = {
  fichier: File;
  url: string;
  type: "photo" | "video";
};

function trimestreActuel() {
  const maintenant = new Date();
  const trimestre = Math.floor(maintenant.getMonth() / 3) + 1;
  return `T${trimestre}-${maintenant.getFullYear()}`;
}

function dureeVideo(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(v.duration);
    v.onerror = () => resolve(0);
    v.src = url;
  });
}

const CLASSE_CHAMP =
  "w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-[15px] outline-none focus:border-accent transition-colors";
const CLASSE_LABEL = "block text-sm text-ink/60 mb-1.5 mt-5";

export default function CreerCampagneForm() {
  const router = useRouter();
  const inputMedia = useRef<HTMLInputElement>(null);

  const [media, setMedia] = useState<Media | null>(null);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [prix, setPrix] = useState("");
  const [objectif, setObjectif] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [abonnementRequis, setAbonnementRequis] = useState(false);

  // Libère l'aperçu local quand on change de média ou qu'on quitte la page.
  useEffect(() => {
    return () => {
      if (media) URL.revokeObjectURL(media.url);
    };
  }, [media]);

  async function choisirMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;

    setErreur(null);

    const estVideo = fichier.type.startsWith("video/");
    const estPhoto = fichier.type.startsWith("image/");
    if (!estVideo && !estPhoto) {
      setErreur("Choisis une photo ou une vidéo.");
      return;
    }

    const url = URL.createObjectURL(fichier);

    if (estVideo) {
      const duree = await dureeVideo(url);
      if (duree > DUREE_VIDEO_MAX) {
        URL.revokeObjectURL(url);
        setErreur(`La vidéo doit durer ${DUREE_VIDEO_MAX} secondes maximum.`);
        return;
      }
    }

    setMedia({ fichier, url, type: estVideo ? "video" : "photo" });
  }

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setAbonnementRequis(false);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id;
    if (!uid) {
      setErreur("Connecte-toi pour publier une campagne.");
      return;
    }

    // Même contrôle que sur la liste des produits : un abonnement "payé"
    // pour le mois en cours.
    const premierJourMois = new Date();
    premierJourMois.setDate(1);
    const moisCourant = premierJourMois.toISOString().slice(0, 10);

    const { data: abonnement } = await supabase
      .from("abonnements")
      .select("id")
      .eq("profile_id", uid)
      .eq("mois", moisCourant)
      .eq("statut", "payé")
      .maybeSingle();

    if (!abonnement) {
      setAbonnementRequis(true);
      setErreur("Un abonnement actif est requis pour créer une campagne.");
      return;
    }

    if (!media) {
      setErreur("Ajoute une photo ou une vidéo pour ta campagne.");
      return;
    }
    if (!titre.trim() || !description.trim()) {
      setErreur("Le titre et la description sont obligatoires.");
      return;
    }
    const prixNombre = parseFloat(prix.replace(",", "."));
    if (!prixNombre || prixNombre <= 0) {
      setErreur("Entre un prix valide.");
      return;
    }
    const objectifNombre = parseInt(objectif, 10);
    if (!objectifNombre || objectifNombre <= 0) {
      setErreur("Entre un nombre de réservations visé (ex : 100).");
      return;
    }
    if (!dateFin) {
      setErreur("Choisis une date de fin pour ta campagne.");
      return;
    }
    // Fin de journée locale du jour choisi.
    const dateFinComplete = new Date(`${dateFin}T23:59:59`);
    if (dateFinComplete.getTime() <= Date.now()) {
      setErreur("La date de fin doit être dans le futur.");
      return;
    }

    setEnCours(true);

    try {
      const trimestre = trimestreActuel();

      const { count, error: erreurComptage } = await supabase
        .from("campagnes")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", uid)
        .eq("trimestre", trimestre);

      if (erreurComptage) {
        setErreur(erreurComptage.message);
        return;
      }

      if ((count ?? 0) >= 1) {
        setErreur(
          `Tu as déjà publié une campagne ce trimestre (${trimestre}). Tu pourras en publier une nouvelle le trimestre prochain.`
        );
        return;
      }

      const extension =
        media.fichier.name.split(".").pop() || (media.type === "video" ? "mp4" : "jpg");
      const nomFichier = `${uid}/campagne-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("campagnes")
        .upload(nomFichier, media.fichier, {
          contentType:
            media.fichier.type ||
            (media.type === "video" ? `video/${extension}` : `image/${extension}`),
        });

      if (uploadError) {
        setErreur(`Erreur d'envoi du média : ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("campagnes")
        .getPublicUrl(nomFichier);

      const { data: campagneCreee, error: insertError } = await supabase
        .from("campagnes")
        .insert({
          profile_id: uid,
          titre: titre.trim(),
          description: description.trim(),
          prix: prixNombre,
          objectif_reservations: objectifNombre,
          media_url: urlData.publicUrl,
          media_type: media.type,
          date_fin: dateFinComplete.toISOString(),
          trimestre,
        })
        .select("id")
        .single();

      if (insertError || !campagneCreee) {
        setErreur(insertError?.message ?? "Impossible de créer la campagne.");
        return;
      }

      // Notifie tous les membres — ne bloque pas la publication si ça échoue.
      const { error: notifError } = await supabase.rpc("notifier_nouvelle_campagne", {
        p_campagne_id: campagneCreee.id,
      });
      if (notifError) {
        console.warn("Notification campagne non envoyée :", notifError.message);
      }

      router.push("/produits");
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setEnCours(false);
    }
  }

  const aujourdhui = new Date().toLocaleDateString("en-CA"); // AAAA-MM-JJ

  return (
    <form onSubmit={publier} className="w-full max-w-xl mx-auto px-4 pt-5 pb-24">
      {/* Zone média */}
      <button
        type="button"
        onClick={() => inputMedia.current?.click()}
        className={`relative block w-full h-56 rounded-2xl overflow-hidden bg-surface ${
          media ? "" : "border border-dashed border-surface-border"
        }`}
      >
        {media ? (
          media.type === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video
              src={media.url}
              muted
              loop
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted text-[13px]">
            <span aria-hidden="true" className="text-3xl">
              📷
            </span>
            Ajouter une photo ou vidéo
          </span>
        )}
      </button>
      <input
        ref={inputMedia}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={choisirMedia}
      />
      <p className="text-xs text-muted mt-2">
        {media ? "Touche l'aperçu pour changer de média. " : ""}
        Vidéo de {DUREE_VIDEO_MAX} secondes maximum.
      </p>

      <label htmlFor="titre" className={CLASSE_LABEL}>
        Titre
      </label>
      <input
        id="titre"
        type="text"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Titre de la campagne"
        className={CLASSE_CHAMP}
      />

      <label htmlFor="description" className={CLASSE_LABEL}>
        Description
      </label>
      <textarea
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Décris ta campagne..."
        rows={4}
        className={`${CLASSE_CHAMP} resize-none`}
      />

      <label htmlFor="prix" className={CLASSE_LABEL}>
        Prix ($)
      </label>
      <input
        id="prix"
        type="text"
        inputMode="decimal"
        value={prix}
        onChange={(e) => setPrix(e.target.value)}
        placeholder="0.00"
        className={CLASSE_CHAMP}
      />

      <label htmlFor="objectif" className={CLASSE_LABEL}>
        Objectif (nombre de réservations)
      </label>
      <input
        id="objectif"
        type="number"
        inputMode="numeric"
        min={1}
        value={objectif}
        onChange={(e) => setObjectif(e.target.value)}
        placeholder="Ex : 100"
        className={CLASSE_CHAMP}
      />

      <label htmlFor="date-fin" className={CLASSE_LABEL}>
        Date de fin de la campagne
      </label>
      <input
        id="date-fin"
        type="date"
        min={aujourdhui}
        value={dateFin}
        onChange={(e) => setDateFin(e.target.value)}
        className={CLASSE_CHAMP}
      />

      {erreur && (
        <div role="alert" className="mt-5 text-sm text-danger">
          <p>{erreur}</p>
          {abonnementRequis && (
            <Link
              href="/compte/abonnement"
              className="inline-block mt-1 underline decoration-2 underline-offset-4"
            >
              Aller à la page abonnement
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="w-full mt-7 rounded-full bg-accent text-accent-ink font-bold text-[15px] py-3.5 disabled:opacity-60"
      >
        {enCours ? "Publication..." : "Publier la campagne"}
      </button>
    </form>
  );
}
