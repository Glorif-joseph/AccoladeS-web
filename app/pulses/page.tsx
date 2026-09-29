import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function Pulses() {
  const supabase = await createClient();

  // La policy RLS ("Pulses visibles par tous si non expires") filtre déjà
  // aux pulses actifs (expires_at > now()).
  const { data: pulses } = await supabase
    .from("pulses")
    .select("id, profile_id, media_url, media_type, created_at, profiles ( pseudo, photo_url )")
    .order("created_at", { ascending: false });

  const parAuteur = new Map<
    string,
    { pseudo: string; photoUrl: string | null; nb: number; vignette: string; typeVignette: string }
  >();

  for (const p of pulses ?? []) {
    const auteur = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    if (!parAuteur.has(p.profile_id)) {
      parAuteur.set(p.profile_id, {
        pseudo: auteur?.pseudo ?? "Membre AccoladeS",
        photoUrl: auteur?.photo_url ?? null,
        nb: 1,
        vignette: p.media_url,
        typeVignette: p.media_type,
      });
    } else {
      parAuteur.get(p.profile_id)!.nb += 1;
    }
  }

  const auteurs = [...parAuteur.entries()];

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="max-w-6xl mx-auto px-8 py-10">
        <h1 className="font-display text-4xl mb-2">Pulses</h1>
        <p className="text-ink/60 mb-10">Visibles 24h, publiés par les membres actifs.</p>

        {auteurs.length === 0 && (
          <p className="text-ink/50">Aucun pulse actif pour l&rsquo;instant.</p>
        )}

        <div className="flex flex-wrap gap-6">
          {auteurs.map(([id, info]) => (
            <Link key={id} href={`/pulses/${id}`} className="flex flex-col items-center gap-2 group">
              <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-accent to-danger">
                <div className="w-full h-full rounded-full overflow-hidden relative bg-paper border-2 border-paper">
                  {info.photoUrl ? (
                    <Image
                      src={info.photoUrl}
                      alt={info.pseudo}
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/10 font-display text-accent">
                      {info.pseudo[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-sm max-w-[5rem] truncate">{info.pseudo}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
