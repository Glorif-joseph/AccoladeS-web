"use client";

import { mettreAJourPhotosAvatar, mettreAJourPhotosCouverture } from "@/app/compte/actions";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRef, useState } from "react";
import PalierBadge from "./PalierBadge";

const LIMITE_COUVERTURE = 5;
const LIMITE_AVATAR = 2;

export default function ProfilPhotos({
  userId,
  pseudo,
  statutActuel,
  photosAvatarInitial,
  photosCouvertureInitial,
}: {
  userId: string;
  pseudo: string;
  statutActuel: string;
  photosCouvertureInitial: string[];
  photosAvatarInitial: string[];
}) {
  const [photosCouverture, setPhotosCouverture] = useState(photosCouvertureInitial);
  const [photosAvatar, setPhotosAvatar] = useState(photosAvatarInitial);
  const [coverIndex, setCoverIndex] = useState(0);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [envoiEnCours, setEnvoiEnCours] = useState<"avatar" | "couverture" | null>(null);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const inputCouverture = useRef<HTMLInputElement>(null);
  const inputAvatar = useRef<HTMLInputElement>(null);

  async function televerser(fichiers: FileList, type: "avatar" | "couverture") {
    const bucket = type === "avatar" ? "avatars" : "couvertures";
    const limite = type === "avatar" ? LIMITE_AVATAR : LIMITE_COUVERTURE;
    const actuelles = type === "avatar" ? photosAvatar : photosCouverture;
    const placesRestantes = limite - actuelles.length;

    if (placesRestantes <= 0) return;

    setEnvoiEnCours(type);
    const supabase = createClient();
    const nouvellesUrls: string[] = [];

    for (const fichier of Array.from(fichiers).slice(0, placesRestantes)) {
      const extension = fichier.name.split(".").pop() || "jpg";
      const nomFichier = `${userId}/${type === "avatar" ? "avatar" : "couverture"}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error } = await supabase.storage.from(bucket).upload(nomFichier, fichier, {
        contentType: fichier.type || `image/${extension}`,
      });

      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(nomFichier);
        nouvellesUrls.push(`${data.publicUrl}?t=${Date.now()}`);
      }
    }

    if (nouvellesUrls.length > 0) {
      const fusion = [...actuelles, ...nouvellesUrls].slice(0, limite);
      if (type === "avatar") {
        setPhotosAvatar(fusion);
        await mettreAJourPhotosAvatar(fusion);
      } else {
        setPhotosCouverture(fusion);
        await mettreAJourPhotosCouverture(fusion);
      }
    }

    setEnvoiEnCours(null);
  }

  return (
    <>
      {/* Couverture — carrousel comme profil.tsx (couvertureWrapper) */}
      <div className="relative w-full h-36 bg-anthracite overflow-hidden">
        {photosCouverture.length > 0 ? (
          <Image
            src={photosCouverture[coverIndex]}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <button
            onClick={() => inputCouverture.current?.click()}
            className="absolute inset-0 flex items-center justify-center text-muted text-sm"
          >
            Ajouter une photo de couverture
          </button>
        )}

        {photosCouverture.length > 1 && (
          <div className="absolute bottom-2.5 left-2.5 flex gap-1">
            {photosCouverture.map((_, i) => (
              <button
                key={i}
                onClick={() => setCoverIndex(i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === coverIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => inputCouverture.current?.click()}
          disabled={envoiEnCours === "couverture"}
          className="absolute bottom-2.5 right-2.5 rounded-full bg-accent text-accent-ink text-xs font-semibold px-2.5 py-1.5"
        >
          {envoiEnCours === "couverture"
            ? "Envoi..."
            : photosCouverture.length >= LIMITE_COUVERTURE
            ? "Limite atteinte"
            : "+ Ajouter"}
        </button>
        <input
          ref={inputCouverture}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && televerser(e.target.files, "couverture")}
        />
      </div>

      <div className="max-w-2xl mx-auto px-8">
        {/* Avatar + pseudo, chevauche la couverture comme dans l'app ; le
            badge de palier reprend le gris neutre observé sur la capture
            partagée ("Nouveau"), pas une teinte turquoise inventée */}
        <div className="flex items-end justify-between -mt-9 mb-1">
          <div className="flex items-end gap-3">
            <button
              onClick={() =>
                photosAvatar.length > 1
                  ? setAvatarIndex((i) => (i + 1) % photosAvatar.length)
                  : inputAvatar.current?.click()
              }
              className="shrink-0"
            >
              {photosAvatar.length > 0 ? (
                <Image
                  src={photosAvatar[avatarIndex]}
                  alt=""
                  width={72}
                  height={72}
                  className="rounded-full border-[3px] border-paper object-cover"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-full border-[3px] border-paper bg-anthracite flex items-center justify-center text-accent text-2xl font-bold">
                  {pseudo?.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
            <p className="font-display text-2xl font-bold mb-1">{pseudo}</p>
          </div>
          <PalierBadge statut={statutActuel} />
        </div>
        <button
          onClick={() => inputAvatar.current?.click()}
          disabled={envoiEnCours === "avatar"}
          className="text-[10px] text-muted mb-3"
        >
          {envoiEnCours === "avatar"
            ? "Envoi..."
            : photosAvatar.length > 1
            ? "Toucher pour changer"
            : "Changer"}
        </button>
        <input
          ref={inputAvatar}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && televerser(e.target.files, "avatar")}
        />

        {/* Bouton "Changer profil et couverture" (boutonChangerPhotos) —
            l'app ouvre une Alert à 3 choix, ici un petit menu inline */}
        <div className="relative mb-4">
          <button
            onClick={() => setMenuOuvert((v) => !v)}
            className="w-full rounded-full bg-surface border border-surface-border py-2.5 text-[13px] font-semibold"
          >
            📷 Changer profil et couverture
          </button>
          {menuOuvert && (
            <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-paper border border-surface-border rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => {
                  setMenuOuvert(false);
                  inputAvatar.current?.click();
                }}
                className="w-full text-left px-4 py-3 text-sm border-b border-surface-border"
              >
                Photo de profil
              </button>
              <button
                onClick={() => {
                  setMenuOuvert(false);
                  inputCouverture.current?.click();
                }}
                className="w-full text-left px-4 py-3 text-sm"
              >
                Photo de couverture
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
