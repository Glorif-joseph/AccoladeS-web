// PalierBadge.tsx n'a jamais été partagé — ce composant reprend le seul
// rendu confirmé par une capture d'écran de l'app (badge "Nouveau" en gris
// neutre, voir components/ProfilPhotos.tsx). Tous les paliers ont donc la
// même couleur pour l'instant, faute de savoir s'ils sont différenciés.
export default function PalierBadge({ statut }: { statut: string }) {
  return (
    <span className="rounded-full bg-gris-fonce text-paper text-xs font-semibold px-3 py-1 whitespace-nowrap">
      {statut}
    </span>
  );
}
