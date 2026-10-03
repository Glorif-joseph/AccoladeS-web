import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

// Page de création de campagne : À ADAPTER si ton adresse est différente.
const ROUTE_CREER_CAMPAGNE = "/campagnes/nouvelle";

// Rangée horizontale scrollable de vignettes, comme sur l'app : la carte
// "Créer" (pointillés + turquoise) vient en premier, suivie des campagnes.
export default async function CampagnesRangee() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campagnes } = await supabase
    .from("campagnes")
    .select("id, titre, prix, media_url, media_type, date_fin")
    .order("date_fin", { ascending: true })
    .limit(10);

  // Non connecté : on passe par la connexion, puis on revient à la création.
  const hrefCreer = user
    ? ROUTE_CREER_CAMPAGNE
    : `/connexion?redirect=${ROUTE_CREER_CAMPAGNE}`;

  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold mb-3">Campagnes</h2>

      {/* -mx-4 px-4 : la rangée défile jusqu'au bord de l'écran
          (la page a un px-4) */}
      <div className="-mx-4 px-4 overflow-x-auto pb-1">
        <div className="flex gap-3 w-max">
          <Link
            href={hrefCreer}
            className="w-28 h-44 shrink-0 rounded-2xl border-2 border-dashed border-ink/15 flex flex-col items-center justify-center gap-2"
          >
            <span aria-hidden="true" className="text-4xl font-light leading-none text-accent">
              +
            </span>
            <span className="text-[13px] font-semibold">Créer</span>
          </Link>

          {(campagnes ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/campagnes/${c.id}`}
              className="relative w-28 h-44 shrink-0 rounded-2xl overflow-hidden bg-anthracite"
            >
              {c.media_type === "video" ? (
                <video
                  src={c.media_url}
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={c.media_url}
                  alt={c.titre}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
                <p className="text-xs font-semibold text-white truncate">{c.titre}</p>
                <p className="text-xs font-bold text-accent">{c.prix} $</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}