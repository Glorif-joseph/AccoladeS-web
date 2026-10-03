import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supprimerProduit } from "./actions";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function MesProduits() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/produits");

  const { data: produits } = await supabase
    .from("produits")
    .select("id, titre, image_url, date_publication, likes(count)")
    .eq("profile_id", user.id)
    .order("date_publication", { ascending: false });

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-8 py-10">
      <SiteHeader />

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Mes produits</h1>
        <Link
          href="/compte/produits/nouveau"
          className="rounded-full bg-accent text-ink px-5 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
        >
          + Nouveau produit
        </Link>
      </div>

      {produits && produits.length === 0 && (
        <p className="text-ink/50">
          Tu n&rsquo;as encore publié aucun produit.
        </p>
      )}

      <ul className="space-y-4">
        {produits?.map((produit) => (
          <li
            key={produit.id}
            className="flex items-center gap-4 border-b border-ink/10 pb-4"
          >
            <div className="w-16 h-16 rounded-lg bg-accent/10 relative overflow-hidden shrink-0">
              {produit.image_url && (
                <Image
                  src={produit.image_url}
                  alt={produit.titre ?? "Produit"}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <Link
                href={`/produits/${produit.id}`}
                className="font-medium hover:text-accent transition-colors"
              >
                {produit.titre ?? "Produit sans titre"}
              </Link>
              <p className="text-sm text-ink/50">
                ♡ {produit.likes?.[0]?.count ?? 0}
              </p>
            </div>
            <form action={supprimerProduit.bind(null, produit.id)}>
              <button
                type="submit"
                className="text-sm text-danger hover:underline underline-offset-4"
              >
                Supprimer
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
