import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

// Page de création d'un pulse : À ADAPTER si ton adresse est différente.
const ROUTE_CREER_PULSE = "/pulses/nouveau";

type GroupePulse = {
  profileId: string;
  pseudo: string;
  photo: string | null;
  toutVu: boolean;
  estSuivi: boolean;
  dernierPulseAt: string;
};

// Première photo d'avatar du membre, sinon sa photo de profil.
function premierePhoto(photosAvatar: string[] | null | undefined, photoUrl: string | null | undefined) {
  return photosAvatar?.length ? photosAvatar[0] : photoUrl ?? null;
}

function Avatar({ photo, pseudo }: { photo: string | null; pseudo: string }) {
  return photo ? (
    <Image src={photo} alt={pseudo} fill sizes="72px" className="object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-accent/10 font-display text-accent">
      {pseudo[0]?.toUpperCase()}
    </div>
  );
}

export default async function Pulses() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Même règle que l'app : on ne garde que les pulses dont `expires_at` est
  // dans le futur (24 h). Le filtre est explicite : la policy RLS ne suffit
  // pas si une autre policy laisse l'auteur voir ses propres pulses expirés.
  const { data: pulses } = await supabase
    .from("pulses")
    .select("id, profile_id, created_at, profiles ( pseudo, photo_url, photos_avatar )")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const idsPulses = (pulses ?? []).map((p) => p.id);

  let idsSuivis = new Set<string>();
  let idsVus = new Set<string>();
  let maPhoto: string | null = null;

  if (user) {
    const [{ data: suivisData }, { data: vuesData }, { data: monProfil }] = await Promise.all([
      supabase.from("followers").select("suivi_id").eq("follower_id", user.id),
      supabase
        .from("pulse_vues")
        .select("pulse_id")
        .eq("viewer_id", user.id)
        .in("pulse_id", idsPulses.length ? idsPulses : [""]),
      supabase.from("profiles").select("photo_url, photos_avatar").eq("id", user.id).single(),
    ]);

    idsSuivis = new Set((suivisData ?? []).map((s) => s.suivi_id as string));
    idsVus = new Set((vuesData ?? []).map((v) => v.pulse_id as string));
    maPhoto = premierePhoto(monProfil?.photos_avatar, monProfil?.photo_url);
  }

  const jAiUnPulseActif = !!user && (pulses ?? []).some((p) => p.profile_id === user.id);

  const parProfil: Record<string, GroupePulse> = {};
  for (const p of pulses ?? []) {
    const auteur = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const pid = p.profile_id as string;

    if (!parProfil[pid]) {
      parProfil[pid] = {
        profileId: pid,
        pseudo: auteur?.pseudo ?? "Membre AccoladeS",
        photo: premierePhoto(auteur?.photos_avatar, auteur?.photo_url),
        toutVu: true,
        estSuivi: idsSuivis.has(pid),
        dernierPulseAt: p.created_at,
      };
    }
    if (!idsVus.has(p.id)) parProfil[pid].toutVu = false;
    if (p.created_at > parProfil[pid].dernierPulseAt) parProfil[pid].dernierPulseAt = p.created_at;
  }

  // Ton propre pulse n'est pas dans la liste : il a sa propre vignette
  // "Mon Pulse" en première position, comme dans l'app.
  const autres = Object.values(parProfil)
    .filter((g) => g.profileId !== user?.id)
    .sort((a, b) => {
      if (a.estSuivi !== b.estSuivi) return a.estSuivi ? -1 : 1;
      if (a.toutVu !== b.toutVu) return a.toutVu ? 1 : -1;
      return b.dernierPulseAt.localeCompare(a.dernierPulseAt);
    });

  // Plein écran : plus de conteneur max-w-6xl centré. Le SiteHeader est sorti
  // du <main> pour s'étendre sur toute la largeur.
  return (
    <div className="w-full min-h-screen bg-paper flex flex-col">
      <SiteHeader />

      <main className="flex-1 px-4 pt-6 pb-24">
        <h1 className="font-display text-3xl mb-1">Pulses</h1>
        <p className="text-ink/60 mb-6">Visibles 24h, publiés par les membres actifs.</p>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-3 gap-y-5">
          {/* Mon Pulse */}
          {user && (
            <Link
              href={jAiUnPulseActif ? `/pulses/${user.id}` : ROUTE_CREER_PULSE}
              className="flex flex-col items-center gap-2"
            >
              {jAiUnPulseActif ? (
                <div className="relative w-[72px] h-[72px]">
                  <div className="w-full h-full rounded-full p-[3px] bg-accent">
                    <div className="w-full h-full rounded-full overflow-hidden relative bg-paper border-2 border-paper">
                      <Avatar photo={maPhoto} pseudo="Moi" />
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent text-accent-ink border-2 border-paper flex items-center justify-center text-xs font-black leading-none"
                  >
                    +
                  </span>
                </div>
              ) : (
                <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-ink/15 flex items-center justify-center text-3xl font-light text-accent">
                  +
                </div>
              )}
              <span className="text-sm w-full text-center truncate">Mon Pulse</span>
            </Link>
          )}

          {/* Pulses des autres membres */}
          {autres.map((g) => (
            <Link
              key={g.profileId}
              href={`/pulses/${g.profileId}`}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`w-[72px] h-[72px] rounded-full p-[3px] ${
                  g.toutVu ? "bg-[#DDDDDD]" : "bg-accent"
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden relative bg-paper border-2 border-paper">
                  <Avatar photo={g.photo} pseudo={g.pseudo} />
                </div>
              </div>
              <span className="text-sm w-full text-center truncate">{g.pseudo}</span>
            </Link>
          ))}
        </div>

        {autres.length === 0 && (
          <p className="text-ink/50 mt-8">Aucun pulse actif pour l&rsquo;instant.</p>
        )}
      </main>
    </div>
  );
}
