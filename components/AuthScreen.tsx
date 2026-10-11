"use client";

import { useState, useTransition } from "react";
import { seConnecter, sInscrire } from "@/app/(auth)/actions";

export default function AuthScreen({
  redirectVers,
  erreur,
  modeInitial = "connexion",
}: {
  redirectVers: string;
  erreur?: string;
  modeInitial?: "connexion" | "inscription";
}) {
  const [mode, setMode] = useState<"connexion" | "inscription">(modeInitial);
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreurLocale(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      // En cas de succès, les deux actions redirigent (bienvenue ou produits) :
      // on n'arrive ici que s'il y a une erreur à afficher.
      const res = mode === "inscription" ? await sInscrire(formData) : await seConnecter(formData);
      setErreurLocale(res.erreur);
    });
  }

  const erreurAffichee = erreurLocale ?? erreur;

  const classeChamp =
    "w-full bg-gris-fonce border border-bordure rounded-[10px] p-3.5 text-paper text-sm placeholder:text-[#8A8A8E] outline-none focus:border-accent";

  return (
    <main className="min-h-screen flex items-center justify-center bg-anthracite p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-[14px] bg-black border-[1.5px] border-accent flex items-center justify-center mb-3">
            <span className="text-paper text-xl font-medium">AS</span>
          </div>
          <h1 className="text-paper text-xl font-medium">
            {mode === "inscription" ? "Créer un compte" : "Connexion"}
          </h1>
          <p className="text-[#A9A29A] text-[13px] mt-1">
            Bienvenue dans la communauté
          </p>
        </div>

        {erreurAffichee && (
          <p className="mb-4 text-sm text-danger border border-danger/30 rounded-lg px-4 py-3">
            {erreurAffichee}
          </p>
        )}

        <form onSubmit={soumettre} className="space-y-3">
          <input type="hidden" name="redirect" value={redirectVers} />

          {mode === "inscription" ? (
            <>
              <input
                name="pseudo"
                placeholder="Pseudo"
                required
                autoCapitalize="none"
                className={classeChamp}
              />

              <div>
                <input
                  type="tel"
                  name="telephone"
                  placeholder="Numéro de téléphone"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  className={classeChamp}
                />
                <p className="text-[12px] text-[#A9A29A] mt-1.5 px-1">
                  Sans indicatif, +243 est ajouté automatiquement.
                </p>
              </div>
            </>
          ) : (
            <input
              name="identifiant"
              placeholder="Téléphone ou e-mail"
              required
              autoCapitalize="none"
              autoComplete="username"
              className={classeChamp}
            />
          )}

          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            required
            autoComplete={mode === "inscription" ? "new-password" : "current-password"}
            className={classeChamp}
          />

          {mode === "inscription" && (
            <input
              name="codePromo"
              placeholder="Code promo (optionnel)"
              autoCapitalize="characters"
              className={classeChamp}
            />
          )}

          <button
            type="submit"
            disabled={enCours}
            className="w-full bg-accent rounded-full py-3.5 flex items-center justify-center gap-2 text-accent-ink font-medium text-sm mt-2 disabled:opacity-60"
          >
            {enCours
              ? "Patiente..."
              : mode === "inscription"
              ? "S'inscrire"
              : "Se connecter"}
            {!enCours && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "inscription" ? "connexion" : "inscription");
            setErreurLocale(null);
          }}
          className="w-full text-center mt-5 text-[13px] text-[#A9A29A]"
        >
          {mode === "inscription" ? "Déjà un compte ? " : "Pas de compte ? "}
          <span className="text-accent">
            {mode === "inscription" ? "Se connecter" : "S'inscrire"}
          </span>
        </button>
      </div>
    </main>
  );
}
