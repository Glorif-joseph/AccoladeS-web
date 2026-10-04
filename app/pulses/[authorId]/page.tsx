import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PulseViewer from "@/components/PulseViewer";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function PulsesAuteur({
  params,
}: {
  params: Promise<{ authorId: string }>;
}) {
  const { authorId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: auteur } = await supabase
    .from("profiles")
    .select("pseudo")
    .eq("id", authorId)
    .single();

  if (!auteur) notFound();

  // Même règle que l'app : seuls les pulses dont `expires_at` est dans le
  // futur (24 h) sont affichés. Le filtre est explicite : la policy RLS ne
  // suffit pas si une autre policy laisse l'auteur voir ses propres pulses
  // expirés (c'est ce qui gardait ton pulse visible après 24 h).
  const { data: pulses } = await supabase
    .from("pulses")
    .select("id, media_url, media_type, created_at, pulse_likes ( count )")
    .eq("profile_id", authorId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  // Plus aucun pulse actif pour cet auteur (tous expirés) : retour à la liste
  // plutôt qu'une page d'erreur 404.
  if (!pulses || pulses.length === 0) redirect("/pulses");

  let mesLikes: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("pulse_likes")
      .select("pulse_id")
      .eq("utilisateur_id", user.id)
      .in(
        "pulse_id",
        pulses.map((p) => p.id)
      );
    mesLikes = data?.map((l) => l.pulse_id) ?? [];
  }

  const pulsesFormates = pulses.map((p) => ({
    id: p.id,
    media_url: p.media_url,
    media_type: p.media_type,
    nbLikes: p.pulse_likes?.[0]?.count ?? 0,
    dejaLike: mesLikes.includes(p.id),
  }));

  // Structure plein écran : la page fait exactement la hauteur de l'écran
  // (h-dvh), le header et la barre de retour gardent leur taille, et la
  // visionneuse occupe tout le reste.
  return (
    <div className="w-full h-dvh flex flex-col bg-paper">
      <SiteHeader />

      <div className="shrink-0 flex items-center px-4 py-3 border-b border-surface-border">
        <Link href="/pulses" className="text-sm text-ink/60 hover:text-accent transition-colors">
          ← Pulses
        </Link>
      </div>

      <main className="flex-1 min-h-0 flex flex-col">
        <PulseViewer pulses={pulsesFormates} pseudo={auteur.pseudo} connecte={!!user} />
      </main>
    </div>
  );
}
