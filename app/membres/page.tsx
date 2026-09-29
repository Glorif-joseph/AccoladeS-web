import SiteHeader from "@/components/SiteHeader";
import MembresListe from "@/components/MembresListe";
import { createClient } from "@/lib/supabase/server";

export default async function Membres() {
  const supabase = await createClient();

  const { data: membres } = await supabase
    .from("profiles")
    .select("id, pseudo, pays, statut_actuel, photo_url")
    .order("pseudo", { ascending: true });

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-center mb-6">
          Membres
        </h1>
        <MembresListe membres={membres ?? []} />
      </div>
    </main>
  );
}
