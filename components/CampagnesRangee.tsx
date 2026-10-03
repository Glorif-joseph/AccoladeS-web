import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

// CampagnesRangee.tsx n'a jamais été partagé — reconstruit à partir du
// schéma déjà utilisé sur /campagnes (même colonnes). Rangée horizontale
// scrollable de vignettes plutôt qu'une liste verticale, pour se distinguer
// du catalogue produits en dessous.
export default async function CampagnesRangee() {
  const supabase = await createClient();

  const { data: campagnes } = await supabase
    .from("campagnes")
    .select("id, titre, prix, media_url, media_type, date_fin")
    .order("date_fin", { ascending: true })
    .limit(10);

  if (!campagnes || campagnes.length === 0) return null;

  return (
    <div className="mb-6 -mx-8 px-8 overflow-x-auto">
      <div className="flex gap-3 w-max">
        {campagnes.map((c) => (
          <Link
            key={c.id}
            href={`/campagnes/${c.id}`}
            className="w-32 shrink-0 bg-paper border border-surface-border rounded-xl overflow-hidden"
          >
            {c.media_type === "video" ? (
              <video
                src={c.media_url}
                muted
                className="w-full h-24 object-cover bg-surface"
              />
            ) : (
              <Image
                src={c.media_url}
                alt={c.titre}
                width={128}
                height={96}
                className="w-full h-24 object-cover bg-surface"
              />
            )}
            <div className="p-2">
              <p className="text-xs font-semibold truncate">{c.titre}</p>
              <p className="text-xs text-accent font-bold mt-0.5">{c.prix} $</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
