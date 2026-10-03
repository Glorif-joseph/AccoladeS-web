import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import CreerCampagneForm from "@/components/CreerCampagneForm";

export const revalidate = 0;

export default async function NouvelleCampagne() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/campagnes/nouvelle");

  return (
    <div className="w-full min-h-screen bg-paper flex flex-col">
      <SiteHeader />

      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <Link
          href="/produits"
          aria-label="Fermer"
          className="w-6 text-xl font-light hover:text-accent transition-colors"
        >
          ✕
        </Link>
        <h1 className="font-display text-lg font-bold">Nouvelle campagne</h1>
        <span className="w-6" aria-hidden="true" />
      </div>

      <main className="flex-1">
        <CreerCampagneForm />
      </main>
    </div>
  );
}
