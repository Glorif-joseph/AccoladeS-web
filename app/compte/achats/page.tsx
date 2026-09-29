import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { declarerAchat, validerAchat } from "./actions";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

const LIBELLES_STATUT: Record<string, string> = {
  en_attente: "En attente",
  validé: "Validé",
  refusé: "Refusé",
};

export default async function MesAchats({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/achats");

  const [{ data: mesAchats }, { data: mesVentes }, { data: membres }] =
    await Promise.all([
      supabase
        .from("achats")
        .select("id, mois, statut_verification, preuve_url, profiles!achats_vendeur_id_fkey(pseudo)")
        .eq("acheteur_id", user.id)
        .order("date_achat", { ascending: false }),
      supabase
        .from("achats")
        .select("id, mois, statut_verification, preuve_url, profiles!achats_acheteur_id_fkey(pseudo)")
        .eq("vendeur_id", user.id)
        .order("date_achat", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, pseudo")
        .neq("id", user.id)
        .order("pseudo"),
    ]);

  // Bucket privé : on signe les URLs des preuves plutôt que d'exposer un
  // lien public, cohérent avec la policy RLS "authenticated only".
  async function signer(chemin: string | null) {
    if (!chemin) return null;
    const { data } = await supabase.storage
      .from("preuves-achats")
      .createSignedUrl(chemin, 300);
    return data?.signedUrl ?? null;
  }

  const ventesAvecPreuve = await Promise.all(
    (mesVentes ?? []).map(async (v) => ({ ...v, preuveSignee: await signer(v.preuve_url) }))
  );

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-8 py-10">
      <SiteHeader />

      <h1 className="font-display text-3xl mb-8">Mes achats</h1>

      {erreur && (
        <p className="mb-8 text-sm text-danger border border-danger/30 rounded-lg px-4 py-3">
          {erreur}
        </p>
      )}

      <section className="mb-16">
        <h2 className="font-display text-xl mb-4">Déclarer un achat du mois</h2>
        <form
          action={declarerAchat}
          encType="multipart/form-data"
          className="flex flex-wrap items-end gap-4 border border-ink/10 rounded-xl p-6"
        >
          <label className="block flex-1 min-w-[200px]">
            <span className="text-sm text-ink/70">Achat effectué chez</span>
            <select
              name="vendeurId"
              required
              className="mt-1 w-full border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2"
            >
              <option value="">Choisir un membre</option>
              {membres?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.pseudo}
                </option>
              ))}
            </select>
          </label>

          <label className="block flex-1 min-w-[200px]">
            <span className="text-sm text-ink/70">Preuve d&rsquo;achat</span>
            <input type="file" name="preuve" accept="image/*,.pdf" required className="mt-1 w-full text-sm" />
          </label>

          <button
            type="submit"
            className="rounded-full bg-accent text-ink px-6 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
          >
            Déclarer
          </button>
        </form>
      </section>

      <section className="mb-16">
        <h2 className="font-display text-xl mb-4">Mes déclarations</h2>
        {mesAchats && mesAchats.length === 0 && (
          <p className="text-ink/50 text-sm">Aucun achat déclaré pour l&rsquo;instant.</p>
        )}
        <ul className="space-y-3">
          {mesAchats?.map((a) => {
            const vendeur = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between border-b border-ink/10 pb-3 text-sm"
              >
                <span>
                  {a.mois} — chez <strong>{vendeur?.pseudo ?? "?"}</strong>
                </span>
                <span
                  className={
                    a.statut_verification === "validé"
                      ? "text-accent"
                      : a.statut_verification === "refusé"
                        ? "text-danger"
                        : "text-ink/50"
                  }
                >
                  {LIBELLES_STATUT[a.statut_verification] ?? a.statut_verification}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Achats à valider (je suis vendeur)</h2>
        {ventesAvecPreuve.length === 0 && (
          <p className="text-ink/50 text-sm">Rien à valider pour l&rsquo;instant.</p>
        )}
        <ul className="space-y-4">
          {ventesAvecPreuve.map((v) => {
            const acheteur = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
            const validerAction = validerAchat.bind(null, v.id);
            return (
              <li key={v.id} className="border border-ink/10 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>
                    {v.mois} — <strong>{acheteur?.pseudo ?? "?"}</strong>
                  </span>
                  <span className="text-ink/50">
                    {LIBELLES_STATUT[v.statut_verification] ?? v.statut_verification}
                  </span>
                </div>
                {v.preuveSignee && (
                  <a
                    href={v.preuveSignee}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent underline underline-offset-4"
                  >
                    Voir la preuve
                  </a>
                )}
                {v.statut_verification === "en_attente" && (
                  <div className="flex gap-3 mt-3">
                    <form action={validerAction}>
                      <input type="hidden" name="decision" value="validé" />
                      <button
                        type="submit"
                        className="rounded-full bg-accent text-paper px-4 py-1.5 text-sm hover:bg-accent-light transition-colors"
                      >
                        Valider
                      </button>
                    </form>
                    <form action={validerAction}>
                      <input type="hidden" name="decision" value="refusé" />
                      <button
                        type="submit"
                        className="rounded-full border border-danger text-danger px-4 py-1.5 text-sm hover:bg-danger/10 transition-colors"
                      >
                        Refuser
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
