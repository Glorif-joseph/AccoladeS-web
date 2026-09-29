import Link from "next/link";
import { creerCampagne } from "../actions";
import SiteHeader from "@/components/SiteHeader";

export default async function NouvelleCampagne({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-8 py-10">
      <SiteHeader />

      <h1 className="font-display text-3xl mb-1">Nouvelle campagne</h1>
      <p className="text-ink/60 mb-8">
        Visible sur le site et dans l&rsquo;app tant qu&rsquo;elle n&rsquo;est pas expirée.
      </p>

      {erreur && (
        <p className="mb-6 text-sm text-danger border border-danger/30 rounded-lg px-4 py-3">
          {erreur}
        </p>
      )}

      <form action={creerCampagne} className="space-y-6" encType="multipart/form-data">
        <label className="block">
          <span className="text-sm text-ink/70">Titre</span>
          <input
            type="text"
            name="titre"
            required
            className="mt-1 w-full border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2 transition-colors"
          />
        </label>

        <label className="block">
          <span className="text-sm text-ink/70">Description</span>
          <textarea
            name="description"
            rows={4}
            className="mt-1 w-full border-2 border-ink/20 focus:border-accent outline-none bg-transparent rounded-lg p-3 transition-colors"
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-6">
          <label className="block">
            <span className="text-sm text-ink/70">Prix (€)</span>
            <input
              type="number"
              name="prix"
              min="0"
              step="0.01"
              required
              className="mt-1 w-full border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2 transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-sm text-ink/70">Date de fin</span>
            <input
              type="date"
              name="date_fin"
              required
              className="mt-1 w-full border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2 transition-colors"
            />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <label className="block">
            <span className="text-sm text-ink/70">Objectif de réservations (optionnel)</span>
            <input
              type="number"
              name="objectif_reservations"
              min="1"
              className="mt-1 w-full border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2 transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-sm text-ink/70">Trimestre (optionnel)</span>
            <input
              type="text"
              name="trimestre"
              placeholder="ex. 2026-T3"
              className="mt-1 w-full border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2 transition-colors"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-ink/70">Visuel (photo ou vidéo)</span>
          <input
            type="file"
            name="media"
            accept="image/*,video/*"
            required
            className="mt-1 w-full text-sm"
          />
        </label>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-full bg-accent text-ink px-6 py-3 font-medium hover:bg-accent-light transition-colors"
          >
            Publier la campagne
          </button>
          <Link href="/compte/campagnes" className="text-sm underline underline-offset-4">
            Annuler
          </Link>
        </div>
      </form>
    </main>
  );
}
