"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PARAGRAPHES = [
  "Bienvenue sur AccoladeS !",
  "Félicitations, votre inscription est maintenant terminée !",
  "Vous venez de rejoindre une communauté pensée pour vous aider à avancer, créer des opportunités et développer vos activités.",
  "Ici, vous n'êtes pas seul.\nVous pouvez découvrir d'autres membres, partager votre activité, développer votre réseau et profiter des différentes opportunités proposées par AccoladeS.",
  "Votre prochaine étape : explorez la plateforme, complétez votre profil et découvrez comment fonctionne votre communauté.",
  "Bienvenue dans l'aventure AccoladeS.",
  "Seul, tu avances. Ensemble, vous construisez davantage.",
  "L'équipe AccoladeS",
];

const DELAI_ENTRE_PARAGRAPHES_MS = 650;
const DUREE_FONDU_MS = 500;

export default function BienvenueAnime() {
  const router = useRouter();
  const [boutonVisible, setBoutonVisible] = useState(false);

  useEffect(() => {
    const minuteur = setTimeout(
      () => setBoutonVisible(true),
      PARAGRAPHES.length * DELAI_ENTRE_PARAGRAPHES_MS + 200
    );
    return () => clearTimeout(minuteur);
  }, []);

  return (
    <main className="min-h-screen bg-anthracite flex flex-col">
      {/*
        Image de couverture — assets/images/bienvenue-accolades.png n'a
        pas encore été partagé, remplacé par un dégradé en attendant.
      */}
      <div className="h-[38vh] w-full bg-gradient-to-br from-accent to-anthracite" />

      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-28">
        {PARAGRAPHES.map((texte, i) => (
          <p
            key={i}
            className="text-white text-[15px] leading-[23px] mb-[18px] whitespace-pre-line opacity-0"
            style={{
              animation: `fondu-bienvenue ${DUREE_FONDU_MS}ms ease forwards`,
              animationDelay: `${i * DELAI_ENTRE_PARAGRAPHES_MS}ms`,
            }}
          >
            {texte}
          </p>
        ))}
      </div>

      {boutonVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-anthracite px-6 pt-4 pb-8 opacity-0"
          style={{ animation: `fondu-bienvenue ${DUREE_FONDU_MS}ms ease forwards` }}
        >
          <button
            onClick={() => router.replace("/produits")}
            className="w-full bg-accent text-accent-ink font-bold rounded-full py-[15px]"
          >
            Continuer
          </button>
        </div>
      )}
    </main>
  );
}
