import SiteHeader from "@/components/SiteHeader";
import MembresListe from "@/components/MembresListe";
import { createClient } from "@/lib/supabase/server";

export default async function Membres() {
  const supabase = await createClient();

  // `count: "exact"` renvoie le nombre total de membres inscrits dans la même
  // requête que la liste (pas de requête en plus).
  const { data: membres, count } = await supabase
    .from("profiles")
    .select("id, pseudo, pays, statut_actuel, photo_url", { count: "exact" })
    .order("pseudo", { ascending: true });

  const total = count ?? membres?.length ?? 0;

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-center mb-1">
          Membres
        </h1>
        <p className="text-center text-xs text-ink/50 mb-6">
          {total.toLocaleString("fr-FR")} {total > 1 ? "membres" : "membre"}
        </p>
        <MembresListe membres={membres ?? []} />
      </div>
    </main>
  );
}
