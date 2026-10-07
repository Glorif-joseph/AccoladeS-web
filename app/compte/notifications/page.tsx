import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { marquerCommeLue, marquerToutesCommeLues } from "./actions";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

// Les notifications sont créées par l'app mobile : leur colonne `lien`
// contient des adresses de l'app (ex. /produit/<id>, /(tabs)/membres) qui
// n'existent pas sur le site et donnaient une erreur 404. On les traduit ici
// vers la page équivalente du site. Retourne null s'il n'y a pas d'équivalent :
// la notification s'affiche alors sans lien (elle reste marquable comme lue).
function lienSite(lien: string | null): string | null {
  if (!lien) return null;

  const adresse = lien.split("?")[0].replace(/\/+$/, "");

  // Déjà une adresse du site : on la garde telle quelle.
  if (/^\/(produits|campagnes|pulses|membres|compte|salon)(\/|$)/.test(adresse)) {
    return adresse;
  }

  // Écrans principaux de l'app (onglets).
  if (adresse === "/(tabs)/membres") return "/membres";
  if (adresse === "/(tabs)/profil") return "/compte";

  // Écrans de détail de l'app.
  const campagne = adresse.match(/^\/campagne\/([^/]+)$/);
  if (campagne) return `/campagnes/${campagne[1]}`;

  const produit = adresse.match(/^\/produit\/([^/]+)$/);
  if (produit) return `/produits/${produit[1]}`;

  return null;
}

function formaterDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function Notifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/notifications");

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, type, contenu, lien, lu, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const nonLues = notifications?.filter((n) => !n.lu).length ?? 0;

  return (
    <div className="w-full min-h-screen bg-paper flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        {/* En-tête : titre + action globale */}
        <div className="px-4 pt-6 pb-5 text-center">
          <h1 className="font-display text-3xl">Notifications</h1>
          {nonLues > 0 && (
            <form action={marquerToutesCommeLues} className="mt-3">
              <button
                type="submit"
                className="text-sm underline decoration-accent decoration-2 underline-offset-4 hover:text-accent transition-colors"
              >
                Tout marquer comme lu
              </button>
            </form>
          )}
        </div>

        {/* Liste : fond gris sur toute la largeur et jusqu'en bas de l'écran */}
        <div className="flex-1 bg-[#f2f2f2] px-4 pt-5 pb-24">
          {error && (
            <p className="text-danger text-sm">
              Impossible de charger les notifications pour le moment.
            </p>
          )}

          {notifications && notifications.length === 0 && (
            <p className="text-ink/50 text-sm">
              Rien à signaler pour l&rsquo;instant.
            </p>
          )}

          <ul className="space-y-2.5">
            {notifications?.map((n) => {
              const lien = lienSite(n.lien);
              const contenu = (
                <div className="flex-1 min-w-0">
                  <p className={n.lu ? "text-ink/70" : "font-medium"}>
                    {n.contenu}
                  </p>
                  <p className="text-xs text-ink/40 mt-1">
                    {formaterDate(n.created_at)}
                  </p>
                </div>
              );

              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 rounded-2xl p-3.5 border ${
                    n.lu
                      ? "border-surface-border bg-paper"
                      : "border-accent bg-accent/5"
                  }`}
                >
                  {!n.lu && (
                    <span
                      aria-hidden="true"
                      className="mt-2 h-2.5 w-2.5 rounded-full bg-accent shrink-0"
                    />
                  )}
                  {lien ? (
                    <Link
                      href={lien}
                      className="flex-1 min-w-0 flex items-start gap-4 hover:text-accent transition-colors"
                    >
                      {contenu}
                    </Link>
                  ) : (
                    contenu
                  )}
                  {!n.lu && (
                    <form action={marquerCommeLue}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        className="text-xs text-ink/40 hover:text-accent transition-colors whitespace-nowrap"
                      >
                        Marquer lu
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
