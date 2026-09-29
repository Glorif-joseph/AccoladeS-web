import Link from "next/link";
import Image from "next/image";
import { MdHome, MdAddCircle } from "react-icons/md";
import MessagesBadgeIcon from "./MessagesBadgeIcon";
import NotificationBell from "./NotificationBell";

// Équivalent de components/BarreOr.tsx côté app : fond turquoise plein,
// avatar à gauche, bouton texte "Pulse" puis icônes à droite (house.fill,
// message.fill, bell.fill, plus.circle.fill — Material Icons via
// components/ui/icon-symbol.tsx côté app, react-icons/md ici pour un rendu
// identique). On ne réplique pas les compteurs "nouveaux produits / nouveaux
// pulses" (basés sur derniere_visite_produits et les vues de pulses) pour
// rester dans le scope de cette phase — messages et notifications suffisent
// à couvrir l'essentiel du "en direct".
export default function AccentBar({
  utilisateurId,
  photoUrl,
  nonLuesInitial,
  nonLusMessagesInitial,
}: {
  utilisateurId: string;
  photoUrl: string | null;
  nonLuesInitial: number;
  nonLusMessagesInitial: number;
}) {
  return (
    <div className="h-[52px] bg-accent flex items-center justify-between px-4">
      <Link href="/compte" aria-label="Mon profil">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            width={32}
            height={32}
            className="rounded-full border-[1.5px] border-accent-ink object-cover"
          />
        ) : (
          <span className="w-8 h-8 rounded-full border-[1.5px] border-accent-ink bg-accent-ink/20 block" />
        )}
      </Link>

      <div className="flex items-center gap-3.5">
        <Link href="/pulses" className="text-white font-bold text-sm">
          Pulse
        </Link>

        <Link
          href="/produits"
          aria-label="Produits"
          className="text-white/[0.85] hover:text-white transition-colors"
        >
          <MdHome size={20} aria-hidden="true" />
        </Link>

        <MessagesBadgeIcon
          utilisateurId={utilisateurId}
          nonLusInitial={nonLusMessagesInitial}
        />

        <NotificationBell utilisateurId={utilisateurId} nonLuesInitial={nonLuesInitial} />

        <Link
          href="/compte/produits/nouveau"
          aria-label="Publier"
          className="text-white/[0.85] hover:text-white transition-colors"
        >
          <MdAddCircle size={20} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
