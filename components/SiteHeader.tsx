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
        supabase.from("profiles").select("photo_url").eq("id", user.id).single(),
      ]);

    nonLues = countNotifs ?? 0;
    nonLusMessages = countMessages ?? 0;
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
        />
      )}
    </header>
  );
}
