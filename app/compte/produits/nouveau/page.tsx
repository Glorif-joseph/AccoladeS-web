import Link from "next/link";
import { creerProduit } from "../actions";
import SiteHeader from "@/components/SiteHeader";

const CLASSE_CHAMP =
  "mt-1 w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-[15px] outline-none focus:border-accent transition-colors";

export default async function NouveauProduit({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  // Plein écran : plus de conteneur max-w-2xl centré, le SiteHeader est
  // sorti du <main> pour s'étendre sur toute la largeur.
  return (
    <div className="w-full min-h-screen bg-paper flex flex-col">
      <SiteHeader />

      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <Link
          href="/compte/produits"
          aria-label="Fermer"
          className="w-6 text-xl font-light hover:text-accent transition-colors"
        >
          ✕
        </Link>
        <h1 className="font-display text-lg font-bold">Nouveau produit</h1>
        <span className="w-6" aria-hidden="true" />
      </div>

      <main className="flex-1 px-4 pt-5 pb-24">
        <p className="text-ink/60 mb-6">
          Visible immédiatement sur le site et dans l&rsquo;app.
        </p>

        {erreur && (
          <p className="mb-6 text-sm text-danger border border-danger/30 rounded-lg px-4 py-3">
            {erreur}
          </p>
        )}

        <form action={creerProduit} className="space-y-5" encType="multipart/form-data">
          <label className="block">
            <span className="text-sm text-ink/70">Titre</span>
            <input type="text" name="titre" required className={CLASSE_CHAMP} />
          </label>

          <label className="block">
            <span className="text-sm text-ink/70">Description</span>
            <textarea
              name="description"
              rows={4}
              className={`${CLASSE_CHAMP} resize-none`}
            />
          </label>

          <label className="block">
            <span className="text-sm text-ink/70">Lien vers la boutique (optionnel)</span>
            <input
              type="url"
              name="lien_boutique"
              placeholder="https://..."
              className={CLASSE_CHAMP}
            />
          </label>

          <label className="block">
            <span className="text-sm text-ink/70">Trimestre (optionnel)</span>
            <input
              type="text"
              name="trimestre"
              placeholder="ex. 2026-T3"
              className={CLASSE_CHAMP}
            />
          </label>

          <label className="block">
            <span className="text-sm text-ink/70">Image</span>
            <input
              type="file"
              name="image"
              accept="image/*"
              className="mt-2 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent file:text-accent-ink file:font-semibold file:px-4 file:py-2"
            />
          </label>

          <p className="text-sm text-ink/50">
            Prix : 2 $ — fixé pour tous les produits digitaux chez AccoladeS.
          </p>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-full bg-accent text-ink px-6 py-3.5 font-bold hover:bg-accent-light transition-colors"
            >
              Publier le produit
            </button>
            <div className="text-center mt-4">
              <Link
                href="/compte/produits"
                className="text-sm underline underline-offset-4"
              >
                Annuler
              </Link>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
