import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export default async function Plateformes() {
  const supabase = await createClient();

  const { data: plateformes } = await supabase
    .from("plateformes_boutique")
    .select("id, nom, description, url, couleur, initiale")
    .eq("active", true)
    .order("ordre", { ascending: true });

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="max-w-xl mx-auto px-6 py-8">
        <h1 className="font-display text-2xl font-bold mb-2">
          Créer ta boutique
        </h1>
        <p className="text-[13px] text-muted leading-[19px] mb-6">
          Ces plateformes externes t&rsquo;aident à mettre en ligne tes
          produits digitaux rapidement. Une fois ta boutique créée, reviens
          publier le lien sur AccoladeS.
        </p>

        <div className="space-y-3">
          {(plateformes ?? []).map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-surface border border-surface-border rounded-xl p-3.5"
            >
              <span
                className="w-11 h-11 rounded-[10px] flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ backgroundColor: p.couleur }}
              >
                {p.initiale}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-ink">{p.nom}</p>
                <p className="text-xs text-muted mt-0.5 leading-[17px]">
                  {p.description}
                </p>
              </div>
              <span className="text-accent text-xl">›</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
