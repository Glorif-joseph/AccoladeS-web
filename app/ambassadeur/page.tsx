import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import AmbassadeurActions from "@/components/AmbassadeurActions";
import { createClient } from "@/lib/supabase/server";

const LIMITE_AMBASSADEURS = 200;

export default async function Ambassadeur() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/ambassadeur");

  const [{ data: profil }, { count: nbAmbassadeurs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("est_ambassadeur, code_promo")
      .eq("id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("est_ambassadeur", true),
  ]);

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="max-w-md mx-auto px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-center mb-6">
          Programme Ambassadeur
        </h1>
        <AmbassadeurActions
          estAmbassadeurInitial={profil?.est_ambassadeur ?? false}
          codePromoInitial={profil?.code_promo ?? null}
          nbAmbassadeursInitial={nbAmbassadeurs ?? 0}
          placesLimite={LIMITE_AMBASSADEURS}
        />
      </div>
    </main>
  );
}
