import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "@/app/(auth)/actions";
import HeaderPanel from "./HeaderPanel";
import AccentBar from "./AccentBar";
import PubCarousel from "./PubCarousel";

// Équivalent de components/AppHeader.tsx côté app mobile, monté une seule
// fois par page plutôt qu'au niveau du layout racine : les pages (auth) —
// connexion/inscription — restent en plein écran, sans cette barre, comme
// un flow d'auth mobile typique hors des tabs.
export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nonLues = 0;
  let nonLusMessages = 0;
  let nonVusPulses = 0;
  let photoUrl: string | null = null;

  if (user) {
    const [{ count: countNotifs }, { count: countMessages }, { data: profil }] =
      await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .eq("lu", false),
        supabase
          .from("messages_prives")
          .select("id", { count: "exact", head: true })
          .eq("destinataire_id", user.id)
          .eq("lu", false),
        supabase
          .from("profiles")
          .select("photo_url, derniere_visite_salon")
          .eq("id", user.id)
          .single(),
      ]);

    // Nouveaux messages du Salon général depuis ta dernière visite, hors les
    // tiens : même règle que la page Messages, pour que les deux chiffres
    // restent cohérents.
    const depuisSalon = profil?.derniere_visite_salon ?? "1970-01-01T00:00:00Z";
    const { count: countSalon } = await supabase
      .from("messages_groupe")
      .select("id", { count: "exact", head: true })
      .gt("created_at", depuisSalon)
      .neq("expediteur_id", user.id);

    // Pulses actifs (moins de 24 h) d'autres membres que tu n'as pas encore
    // vus : même règle que la page Pulses et que le badge « Pulse ».
    const { data: pulsesActifs } = await supabase
      .from("pulses")
      .select("id")
      .gt("expires_at", new Date().toISOString())
      .neq("profile_id", user.id);

    const idsPulses = (pulsesActifs ?? []).map((p) => p.id as string);
    if (idsPulses.length > 0) {
      const { data: vues } = await supabase
        .from("pulse_vues")
        .select("pulse_id")
        .eq("viewer_id", user.id)
        .in("pulse_id", idsPulses);

      const vus = new Set((vues ?? []).map((v) => v.pulse_id as string));
      nonVusPulses = idsPulses.filter((id) => !vus.has(id)).length;
    }

    nonLues = countNotifs ?? 0;
    nonLusMessages = (countMessages ?? 0) + (countSalon ?? 0);
    photoUrl = profil?.photo_url ?? null;
  }

  return (
    <header className="sticky top-0 z-40">
      <div className="relative h-[52px] bg-anthracite flex items-center justify-between px-4 overflow-hidden">
        <PubCarousel />
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          {/* Mark extrait de l'image que tu as partagée (fond blanc dans le
              fichier d'origine) — posé sur un carré clair puisqu'il est noir
              et serait invisible directement sur l'anthracite. Si
              assets/images/logo-symbole.png a une version déjà pensée pour
              fond sombre, partage-la et j'enlève ce carré. */}
          <span className="w-[34px] h-[34px] rounded-[9px] bg-paper flex items-center justify-center p-1.5">
            <Image
              src="/logo-mark.png"
              alt="AccoladeS"
              width={28}
              height={28}
              className="object-contain"
            />
          </span>
        </Link>
        <div className="relative z-10">
          <HeaderPanel connecte={!!user} onDeconnexion={seDeconnecter} />
        </div>
      </div>

      {user && (
        <AccentBar
          utilisateurId={user.id}
          photoUrl={photoUrl}
          nonLuesInitial={nonLues}
          nonLusMessagesInitial={nonLusMessages}
          nonVusPulsesInitial={nonVusPulses}
        />
      )}
    </header>
  );
}
