"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { basculerLikePulse, enregistrerVue } from "@/app/pulses/actions";

type Pulse = {
  id: string;
  media_url: string;
  media_type: string;
  nbLikes: number;
  dejaLike: boolean;
};

const DUREE_MS = 6000;

export default function PulseViewer({
  pulses,
  pseudo,
  connecte,
}: {
  pulses: Pulse[];
  pseudo: string;
  connecte: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(pulses.map((p) => p.dejaLike));
  const [likes, setLikes] = useState(pulses.map((p) => p.nbLikes));

  const pulseActuel = pulses[index];

  useEffect(() => {
    if (!pulseActuel) return;
    enregistrerVue(pulseActuel.id);

    const timer = setTimeout(() => {
      if (index < pulses.length - 1) {
        setIndex((i) => i + 1);
      } else {
        router.push("/pulses");
      }
    }, DUREE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!pulseActuel) return null;

  function suivant() {
    if (index < pulses.length - 1) setIndex((i) => i + 1);
    else router.push("/pulses");
  }

  function precedent() {
    if (index > 0) setIndex((i) => i - 1);
  }

  function basculer() {
    if (!connecte) {
      router.push("/connexion?redirect=/pulses");
      return;
    }
    setLiked((prev) => prev.map((v, i) => (i === index ? !v : v)));
    setLikes((prev) => prev.map((v, i) => (i === index ? v + (liked[index] ? -1 : 1) : v)));
    basculerLikePulse(pulseActuel.id);
  }

  // Plein écran : la visionneuse remplit tout l'espace que lui laisse la page
  // (flex-1 min-h-0), sans largeur maximale ni coins arrondis. Le média
  // couvre tout l'écran sur téléphone ; sur grand écran il est affiché en
  // entier (object-contain) pour ne pas être rogné.
  return (
    <div className="relative flex-1 min-h-0 w-full bg-ink overflow-hidden">
      <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
        {pulses.map((p, i) => (
          <div key={p.id} className="flex-1 h-1 rounded-full bg-paper/30 overflow-hidden">
            <div
              className={`h-full bg-paper transition-all ${
                i < index ? "w-full" : i === index ? "w-full animate-pulse" : "w-0"
              }`}
            />
          </div>
        ))}
      </div>

      <p className="absolute top-7 left-3 text-paper text-sm font-medium z-10 drop-shadow">
        {pseudo}
      </p>

      {pulseActuel.media_type === "video" ? (
        <video
          key={pulseActuel.id}
          src={pulseActuel.media_url}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover md:object-contain"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={pulseActuel.id}
          src={pulseActuel.media_url}
          alt="Pulse"
          className="absolute inset-0 w-full h-full object-cover md:object-contain"
        />
      )}

      <button
        aria-label="Précédent"
        onClick={precedent}
        className="absolute left-0 top-0 h-full w-1/3"
      />
      <button
        aria-label="Suivant"
        onClick={suivant}
        className="absolute right-0 top-0 h-full w-1/3"
      />

      <button
        onClick={basculer}
        className={`absolute bottom-5 right-5 z-10 rounded-full px-4 py-2 text-sm flex items-center gap-2 ${
          liked[index] ? "bg-accent text-ink" : "bg-paper/20 text-paper backdrop-blur"
        }`}
      >
        {liked[index] ? "♥" : "♡"} {likes[index]}
      </button>
    </div>
  );
}
