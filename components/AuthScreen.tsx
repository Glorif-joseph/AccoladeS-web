"use client";

import { useEffect, useState, useTransition } from "react";
import {
  renvoyerCode,
  seConnecter,
  sInscrire,
  verifierCode,
} from "@/app/(auth)/actions";

const DELAI_RENVOI = 60; // secondes avant de pouvoir redemander un code

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
  const [etape, setEtape] = useState<"formulaire" | "code">("formulaire");
  const [emailCode, setEmailCode] = useState("");
  const [code, setCode] = useState("");
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const [infoLocale, setInfoLocale] = useState<string | null>(null);
  const [attente, setAttente] = useState(0);
  const [enCours, startTransition] = useTransition();

  // Compte à rebours avant de pouvoir renvoyer un code.
  useEffect(() => {
    if (attente <= 0) return;
    const t = setTimeout(() => setAttente((a) => a - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  function passerAuCode(email: string, info?: string) {
    setEmailCode(email);
    setCode("");
    setInfoLocale(info ?? null);
    setAttente(DELAI_RENVOI);
    setEtape("code");
  }

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreurLocale(null);
    setInfoLocale(null);

    const formData = new FormData(e.currentTarget);
    const email = ((formData.get("email") as string) ?? "").trim();

    startTransition(async () => {
      if (mode === "inscription") {
        const res = await sInscrire(formData);
        if ("erreur" in res) {
          setErreurLocale(res.erreur);
          return;
        }
        passerAuCode(res.email);
        return;
      }

      const res = await seConnecter(formData);

      // Compte créé mais jamais confirmé : on renvoie un code et on
      // ouvre directement l'écran de saisie.
      if (res.nonConfirme) {
        const envoi = await renvoyerCode(email);
        if ("erreur" in envoi) {
          setErreurLocale(envoi.erreur);
          return;
        }
        passerAuCode(
          email,
          "Ton adresse e-mail n'était pas encore confirmée : un code vient de t'être envoyé."
        );
        return;
      }

      setErreurLocale(res.erreur);
    });
  }

  function soumettreCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreurLocale(null);
    setInfoLocale(null);

    const formData = new FormData();
    formData.set("email", emailCode);
    formData.set("code", code);

    startTransition(async () => {
      // En cas de succès, l'action redirige vers la page de bienvenue.
      const res = await verifierCode(formData);
      setErreurLocale(res.erreur);
    });
  }

  function renvoyer() {
    if (attente > 0 || enCours) return;
    setErreurLocale(null);
    setInfoLocale(null);

    startTransition(async () => {
      const res = await renvoyerCode(emailCode);
      if ("erreur" in res) {
        setErreurLocale(res.erreur);
        return;
      }
      setInfoLocale("Un nouveau code vient d'être envoyé.");
      setAttente(DELAI_RENVOI);
    });
  }

  function revenirAuFormulaire() {
    setEtape("formulaire");
    setCode("");
    setErreurLocale(null);
    setInfoLocale(null);
  }

  const erreurAffichee = erreurLocale ?? erreur;

  const classeChamp =
    "w-full bg-gris-fonce border border-bordure rounded-[10px] p-3.5 text-paper text-sm placeholder:text-[#8A8A8E] outline-none focus:border-accent";

  // ---------- Écran : saisie du code reçu par e-mail ----------
  if (etape === "code") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-anthracite p-6">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-[14px] bg-black border-[1.5px] border-accent flex items-center justify-center mb-3">
              <span className="text-paper text-xl font-medium">AS</span>
            </div>
            <h1 className="text-paper text-xl font-medium">Vérifie ton e-mail</h1>
            <p className="text-[#A9A29A] text-[13px] mt-1 text-center">
              Nous avons envoyé un code de confirmation à
              <br />
              <span className="text-paper">{emailCode}</span>
            </p>
          </div>

          {infoLocale && (
            <p className="mb-4 text-sm text-accent border border-accent/30 rounded-lg px-4 py-3">
              {infoLocale}
            </p>
          )}

          {erreurLocale && (
            <p className="mb-4 text-sm text-danger border border-danger/30 rounded-lg px-4 py-3">
              {erreurLocale}
            </p>
          )}

          <form onSubmit={soumettreCode} className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="Code"
              aria-label="Code de confirmation"
              required
              autoFocus
              className={`${classeChamp} text-center text-2xl tracking-[0.4em]`}
            />

            <button
              type="submit"
              disabled={enCours || code.length < 6}
              className="w-full bg-accent rounded-full py-3.5 flex items-center justify-center gap-2 text-accent-ink font-medium text-sm mt-2 disabled:opacity-60"
            >
              {enCours ? "Vérification..." : "Valider le code"}
            </button>
          </form>

          <button
            type="button"
            onClick={renvoyer}
            disabled={attente > 0 || enCours}
            className="w-full text-center mt-5 text-[13px] text-accent disabled:text-[#A9A29A]"
          >
            {attente > 0 ? `Renvoyer le code (${attente} s)` : "Renvoyer le code"}
          </button>

          <button
            type="button"
            onClick={revenirAuFormulaire}
            className="w-full text-center mt-3 text-[13px] text-[#A9A29A]"
          >
            Modifier mon adresse e-mail
          </button>
        </div>
      </main>
    );
  }

  // ---------- Écran : connexion / inscription ----------
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

          {mode === "inscription" && (
            <input
              name="pseudo"
              placeholder="Pseudo"
              required
              autoCapitalize="none"
              className={classeChamp}
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            autoCapitalize="none"
            autoComplete="email"
            className={classeChamp}
          />

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
