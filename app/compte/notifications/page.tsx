import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { marquerCommeLue, marquerToutesCommeLues } from "./actions";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

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
    <main className="min-h-screen max-w-2xl mx-auto px-8 py-10">
      <SiteHeader />

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Notifications</h1>
        {nonLues > 0 && (
          <form action={marquerToutesCommeLues}>
            <button
              type="submit"
              className="text-sm underline decoration-accent decoration-2 underline-offset-4 hover:text-accent transition-colors"
            >
              Tout marquer comme lu
            </button>
          </form>
        )}
      </div>

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

      <ul className="divide-y divide-ink/10">
        {notifications?.map((n) => {
          const contenu = (
            <div className="flex-1">
              <p className={n.lu ? "text-ink/70" : "font-medium"}>
                {n.contenu}
              </p>
              <p className="text-xs text-ink/40 mt-1">
                {formaterDate(n.created_at)}
              </p>
            </div>
          );

          return (
            <li key={n.id} className="flex items-start gap-4 py-4">
              {!n.lu && (
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 rounded-full bg-accent shrink-0"
                />
              )}
              {n.lien ? (
                <Link
                  href={n.lien}
                  className="flex-1 flex items-start gap-4 -ml-6 pl-6 hover:text-accent transition-colors"
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
    </main>
  );
}
