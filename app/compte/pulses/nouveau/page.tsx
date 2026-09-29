import Link from "next/link";
import { creerPulse } from "../actions";
import SiteHeader from "@/components/SiteHeader";

export default async function NouveauPulse({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <main className="min-h-screen max-w-lg mx-auto px-8 py-10">
      <SiteHeader />

      <h1 className="font-display text-3xl mb-1">Nouveau pulse</h1>
      <p className="text-ink/60 mb-8">Visible 24h, puis retiré automatiquement.</p>

      {erreur && (
        <p className="mb-6 text-sm text-danger border border-danger/30 rounded-lg px-4 py-3">
          {erreur}
        </p>
      )}

      <form action={creerPulse} className="space-y-6" encType="multipart/form-data">
        <label className="block">
          <span className="text-sm text-ink/70">Photo ou vidéo</span>
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
            Publier
          </button>
          <Link href="/compte/pulses" className="text-sm underline underline-offset-4">
            Annuler
          </Link>
        </div>
      </form>
    </main>
  );
}
