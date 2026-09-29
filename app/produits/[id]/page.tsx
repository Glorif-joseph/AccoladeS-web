import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { basculerLike, publierCommentaire } from "../actions";
import LikeButton from "@/components/LikeButton";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function DetailProduit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: produit } = await supabase
    .from("produits")
    .select(
      `id, titre, description, prix, image_url, lien_boutique, date_publication,
       profiles ( pseudo, photo_url, statut_actuel ),
       likes ( count )`
    )
    .eq("id", id)
    .single();

  if (!produit) {
    notFound();
  }

  const auteur = Array.isArray(produit.profiles)
    ? produit.profiles[0]
    : produit.profiles;
  const nbLikes = produit.likes?.[0]?.count ?? 0;

  let dejaLike = false;
  if (user) {
    const { data: likeExistant } = await supabase
      .from("likes")
      .select("id")
      .eq("produit_id", produit.id)
      .eq("utilisateur_id", user.id)
      .maybeSingle();
    dejaLike = !!likeExistant;
  }

  const { data: commentaires } = await supabase
    .from("commentaires")
    .select("id, contenu, created_at, profiles ( pseudo, photo_url )")
    .eq("produit_id", produit.id)
    .order("created_at", { ascending: true });

  const likeAction = basculerLike.bind(null, produit.id);
  const commentAction = publierCommentaire.bind(null, produit.id);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <article className="max-w-4xl mx-auto px-8 pb-20">
        <div className="aspect-[4/3] bg-accent/10 rounded-2xl overflow-hidden relative mb-8">
          {produit.image_url ? (
            <Image
              src={produit.image_url}
              alt={produit.titre ?? "Produit"}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-accent/30 font-display text-3xl">
              AccoladeS
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div>
            <h1 className="font-display text-3xl mb-2">
              {produit.titre ?? "Produit sans titre"}
            </h1>
            <p className="text-ink/60">
              Par <span className="text-ink">{auteur?.pseudo ?? "Membre AccoladeS"}</span>
              {auteur?.statut_actuel && (
                <span className="ml-2 text-xs uppercase tracking-wide text-accent">
                  {auteur.statut_actuel}
                </span>
              )}
            </p>
          </div>
          <p className="font-display text-2xl">{produit.prix} €</p>
        </div>

        {produit.description && (
          <p className="mt-6 text-ink/80 leading-relaxed max-w-xl">
            {produit.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-8">
          <LikeButton
            action={likeAction}
            likedInitial={dejaLike}
            countInitial={nbLikes}
            connected={!!user}
            produitId={produit.id}
          />
          {produit.lien_boutique && (
            <a
              href={produit.lien_boutique}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-accent text-paper px-6 py-2 text-sm hover:bg-accent-light transition-colors"
            >
              Voir la boutique
            </a>
          )}
        </div>

        <section className="mt-16 border-t border-ink/10 pt-10">
          <h2 className="font-display text-xl mb-6">
            {commentaires?.length ?? 0} commentaire
            {(commentaires?.length ?? 0) > 1 ? "s" : ""}
          </h2>

          {user ? (
            <form action={commentAction} className="mb-10 flex gap-3">
              <input
                type="text"
                name="contenu"
                required
                placeholder="Écrire un commentaire..."
                className="flex-1 border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2 transition-colors"
              />
              <button
                type="submit"
                className="rounded-full bg-accent text-ink px-5 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
              >
                Publier
              </button>
            </form>
          ) : (
            <p className="mb-10 text-sm text-ink/60">
              <Link
                href={`/connexion?redirect=/produits/${produit.id}`}
                className="text-accent underline underline-offset-4"
              >
                Connecte-toi
              </Link>{" "}
              pour commenter.
            </p>
          )}

          <ul className="space-y-6">
            {commentaires?.map((c) => {
              const commentateur = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
              return (
                <li key={c.id}>
                  <p className="text-sm text-ink/60 mb-1">
                    {commentateur?.pseudo ?? "Membre AccoladeS"}
                  </p>
                  <p>{c.contenu}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </article>
    </main>
  );
}
