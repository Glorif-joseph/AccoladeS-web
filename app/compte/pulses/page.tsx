import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supprimerPulse } from "./actions";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function MesPulses() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/pulses");

  const { data: pulses } = await supabase
    .from("pulses")
    .select("id, media_url, media_type, created_at, expires_at, pulse_likes ( count )")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const pulsesAvecVues = await Promise.all(
    (pulses ?? []).map(async (p) => {
      const { count } = await supabase
        .from("pulse_vues")
        .select("id", { count: "exact", head: true })
        .eq("pulse_id", p.id);
      return { ...p, nbVues: count ?? 0 };
    })
  );

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-8 py-10">
      <SiteHeader />

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Mes pulses</h1>
        <Link
          href="/compte/pulses/nouveau"
          className="rounded-full bg-accent text-ink px-5 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
        >
          + Nouveau pulse
        </Link>
      </div>

      {pulsesAvecVues.length === 0 && (
        <p className="text-ink/50">
          Aucun pulse actif — les pulses disparaissent automatiquement après 24h.
        </p>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {pulsesAvecVues.map((p) => (
          <li key={p.id} className="relative">
            <div className="aspect-[9/16] rounded-xl overflow-hidden bg-accent/10">
              {p.media_type === "video" ? (
                <video src={p.media_url} className="w-full h-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.media_url} alt="Pulse" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-ink/60">
              <span>♡ {p.pulse_likes?.[0]?.count ?? 0} · 👁 {p.nbVues}</span>
              <form action={supprimerPulse.bind(null, p.id)}>
                <button type="submit" className="text-danger hover:underline underline-offset-4">
                  Suppr.
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
