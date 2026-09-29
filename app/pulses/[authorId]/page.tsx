import Link from "next/link";
import { notFound } from "next/navigation";
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

  const { data: pulses } = await supabase
    .from("pulses")
    .select("id, media_url, media_type, created_at, pulse_likes ( count )")
    .eq("profile_id", authorId)
    .order("created_at", { ascending: true });

  if (!auteur || !pulses || pulses.length === 0) {
    notFound();
  }

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <SiteHeader />
      <div className="w-full max-w-sm mb-4 flex justify-start">
        <Link href="/pulses" className="text-sm text-ink/60 hover:text-accent transition-colors">
          ← Pulses
        </Link>
      </div>
      <PulseViewer pulses={pulsesFormates} pseudo={auteur.pseudo} connecte={!!user} />
    </main>
  );
}
