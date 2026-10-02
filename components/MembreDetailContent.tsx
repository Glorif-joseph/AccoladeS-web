"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PalierBadge from "./PalierBadge";
import SuivreBouton from "./SuivreBouton";

type Produit = {
  id: string;
  titre: string;
  description: string;
  prix: number;
  image_url: string | null;
};

type Campagne = {
  id: string;
  titre: string;
  prix: number;
  media_url: string;
  media_type: "photo" | "video";
  date_fin: string;
};

export default function MembreDetailContent({
  membre,
  photosCouverture,
  photosAvatar,
  nbFollowers,
  nbSuivis,
  estMonProfil,
  produits,
  campagnes,
}: {
  membre: {
    id: string;
    pseudo: string;
    pays: string | null;
    telephone: string | null;
    statut_actuel: string | null;
    bio: string | null;
    points: number;
  };
  photosCouverture: string[];
  photosAvatar: string[];
  nbFollowers: number;
  nbSuivis: number;
  estMonProfil: boolean;
  produits: Produit[];
  campagnes: Campagne[];
}) {
  const [coverIndex, setCoverIndex] = useState(0);
  const [avatarIndex, setAvatarIndex] = useState(0);

  function appeler() {
    if (!membre.telephone) {
      alert("Ce membre n'a pas renseigné de numéro de téléphone.");
      return;
    }
    window.location.href = `tel:${membre.telephone}`;
  }

  return (
    <div>
      {/* Couverture */}
      <div className="relative w-full h-[120px] bg-anthracite overflow-hidden">
        {photosCouverture.length > 0 && (
          <Image
            src={photosCouverture[coverIndex]}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        )}
        {photosCouverture.length > 1 && (
          <div className="absolute bottom-2 left-2.5 flex gap-1">
            {photosCouverture.map((_, i) => (
              <button
                key={i}
                onClick={() => setCoverIndex(i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-1.5 rounded-full ${
                  i === coverIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 flex flex-col items-center text-center mb-6">
        <button
          onClick={() =>
            photosAvatar.length > 1 &&
            setAvatarIndex((i) => (i + 1) % photosAvatar.length)
          }
          className="-mt-[38px] mb-2"
        >
          {photosAvatar.length > 0 ? (
            <Image
              src={photosAvatar[avatarIndex]}
              alt=""
              width={76}
              height={76}
              className="rounded-full border-[3px] border-paper object-cover"
            />
          ) : (
            <div className="w-[76px] h-[76px] rounded-full border-[3px] border-paper bg-anthracite flex items-center justify-center text-accent text-2xl font-bold">
              {membre.pseudo?.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        <p className="text-xl font-bold">{membre.pseudo}</p>
        {membre.pays && <p className="text-[13px] text-muted mb-2">{membre.pays}</p>}
        <PalierBadge statut={membre.statut_actuel ?? "Nouveau"} />

        <div className="flex gap-6 mt-3">
          <div className="text-center">
            <p className="text-base font-bold">{nbFollowers}</p>
            <p className="text-xs text-muted">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold">{nbSuivis}</p>
            <p className="text-xs text-muted">Suivis</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-accent">{membre.points}</p>
            <p className="text-xs text-muted">Acco</p>
          </div>
        </div>

        {membre.bio && (
          <p className="text-[13px] text-ink/70 mt-3 px-5">{membre.bio}</p>
        )}

        {!estMonProfil && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            <SuivreBouton suiviId={membre.id} />
            <Link
              href={`/compte/messages/${membre.id}`}
              className="bg-anthracite text-paper font-semibold text-[13px] rounded-full px-4.5 py-2"
            >
              💬 Message
            </Link>
            <button
              onClick={appeler}
              className="bg-surface border border-surface-border font-semibold text-[13px] rounded-full px-4.5 py-2"
            >
              📞 Appeler
            </button>
          </div>
        )}

        {campagnes.length > 0 && (
          <div className="w-full mt-6 text-left">
            <p className="text-[15px] font-bold mb-2">Campagnes publiées</p>
            {campagnes.map((c) => {
              const estActive = new Date(c.date_fin) > new Date();
              return (
                <Link
                  key={c.id}
                  href={`/campagnes/${c.id}`}
                  className="flex items-center gap-2.5 py-2.5 border-b border-surface-border"
                >
                  <Image
                    src={c.media_url}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.titre}</p>
                    <p
                      className={`text-xs font-semibold ${
                        estActive ? "text-success" : "text-muted"
                      }`}
                    >
                      {estActive ? "Active" : "Terminée"}
                    </p>
                  </div>
                  <p className="text-sm font-bold">{c.prix} $</p>
                </Link>
              );
            })}
          </div>
        )}

        <p className="w-full text-left text-[15px] font-bold mt-6 mb-1">
          Produits publiés
        </p>
      </div>

      {produits.length === 0 ? (
        <p className="text-center text-muted mt-5">
          Ce membre n&rsquo;a encore publié aucun produit.
        </p>
      ) : (
        <div className="px-4 space-y-2.5">
          {produits.map((p) => (
            <Link
              key={p.id}
              href={`/produits/${p.id}`}
              className="flex items-center gap-3 bg-paper border border-surface-border rounded-xl p-2.5"
            >
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt=""
                  width={64}
                  height={64}
                  className="rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-surface shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold truncate">{p.titre}</p>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">
                  {p.description}
                </p>
                <p className="text-sm font-bold mt-1">{p.prix} $</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
