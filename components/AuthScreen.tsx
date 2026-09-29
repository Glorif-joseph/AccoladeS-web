"use client";

import { useState } from "react";
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

        {erreur && (
          <p className="mb-4 text-sm text-danger border border-danger/30 rounded-lg px-4 py-3">
            {erreur}
          </p>
        )}

        <form
          action={mode === "inscription" ? sInscrire : seConnecter}
          className="space-y-3"
        >
          <input type="hidden" name="redirect" value={redirectVers} />

          {mode === "inscription" && (
            <input
              name="pseudo"
              placeholder="Pseudo"
              required
              autoCapitalize="none"
              className="w-full bg-gris-fonce border border-bordure rounded-[10px] p-3.5 text-paper text-sm placeholder:text-[#8A8A8E] outline-none focus:border-accent"
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            autoCapitalize="none"
            autoComplete="email"
            className="w-full bg-gris-fonce border border-bordure rounded-[10px] p-3.5 text-paper text-sm placeholder:text-[#8A8A8E] outline-none focus:border-accent"
          />

          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            required
            autoComplete={mode === "inscription" ? "new-password" : "current-password"}
            className="w-full bg-gris-fonce border border-bordure rounded-[10px] p-3.5 text-paper text-sm placeholder:text-[#8A8A8E] outline-none focus:border-accent"
          />

          {mode === "inscription" && (
            <input
              name="codePromo"
              placeholder="Code promo (optionnel)"
              autoCapitalize="characters"
              className="w-full bg-gris-fonce border border-bordure rounded-[10px] p-3.5 text-paper text-sm placeholder:text-[#8A8A8E] outline-none focus:border-accent"
            />
          )}

          <button
            type="submit"
            className="w-full bg-accent rounded-full py-3.5 flex items-center justify-center gap-2 text-accent-ink font-medium text-sm mt-2"
          >
            {mode === "inscription" ? "S'inscrire" : "Se connecter"}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "inscription" ? "connexion" : "inscription")}
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
