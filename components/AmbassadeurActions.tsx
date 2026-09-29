"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AmbassadeurActions({
  estAmbassadeurInitial,
  codePromoInitial,
  nbAmbassadeursInitial,
  placesLimite,
}: {
  estAmbassadeurInitial: boolean;
  codePromoInitial: string | null;
  nbAmbassadeursInitial: number;
  placesLimite: number;
}) {
  const [estAmbassadeur, setEstAmbassadeur] = useState(estAmbassadeurInitial);
  const [codePromo, setCodePromo] = useState(codePromoInitial);
  const [nbAmbassadeurs, setNbAmbassadeurs] = useState(nbAmbassadeursInitial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function devenirAmbassadeur() {
    setEnCours(true);
    setErreur(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("devenir_ambassadeur");
    setEnCours(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    setEstAmbassadeur(true);
    setCodePromo(data as string);
    setNbAmbassadeurs((n) => n + 1);
  }

  async function partagerCode() {
    if (!codePromo) return;
    const message = `Rejoins AccoladeS avec mon code promo "${codePromo}" et fais partie de la communauté !`;

    // Pas d'équivalent web direct à Share.share() de React Native : on
    // utilise l'API Web Share quand le navigateur la propose (mobile
    // surtout), sinon on copie le message dans le presse-papier.
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch {
        // partage annulé par l'utilisateur — rien à faire
      }
    } else {
      await navigator.clipboard.writeText(message);
      alert("Message copié dans le presse-papier !");
    }
  }

  const placesRestantes = placesLimite - nbAmbassadeurs;

  if (estAmbassadeur) {
    return (
      <>
        <div className="bg-anthracite rounded-2xl p-6 flex flex-col items-center mb-4">
          <p className="text-muted text-[13px] mb-2">Ton code promo</p>
          <p className="text-accent text-3xl font-bold tracking-widest">{codePromo}</p>
        </div>
        <p className="text-ink/60 text-sm leading-relaxed mb-5 text-center">
          Partage ce code : chaque nouveau membre qui l&rsquo;utilise à
          l&rsquo;inscription te rapporte +1 Acco.
        </p>
        <button
          onClick={partagerCode}
          className="w-full bg-accent rounded-full py-[15px] text-accent-ink font-bold text-[15px]"
        >
          Partager mon code
        </button>
      </>
    );
  }

  return (
    <>
      <p className="text-ink/60 text-sm leading-relaxed mb-5 text-center">
        Deviens ambassadeur AccoladeS et obtiens ton propre code promo. Chaque
        personne qui s&rsquo;inscrit avec ton code te rapporte +1 Acco.
      </p>

      {erreur && <p className="text-danger text-sm text-center mb-4">{erreur}</p>}

      {placesRestantes > 0 ? (
        <>
          <div className="bg-surface border border-surface-border rounded-2xl p-5 flex flex-col items-center mb-5">
            <p className="text-accent text-3xl font-bold">{placesRestantes}</p>
            <p className="text-muted text-[13px] mt-1">
              places restantes sur {placesLimite}
            </p>
          </div>
          <button
            onClick={devenirAmbassadeur}
            disabled={enCours}
            className="w-full bg-accent rounded-full py-[15px] text-accent-ink font-bold text-[15px] disabled:opacity-50"
          >
            {enCours ? "Création..." : "Devenir ambassadeur"}
          </button>
        </>
      ) : (
        <div className="bg-danger/10 border border-danger/30 rounded-2xl p-5">
          <p className="text-danger font-semibold text-center">
            Les {placesLimite} places d&rsquo;ambassadeur sont toutes prises.
          </p>
        </div>
      )}
    </>
  );
}
